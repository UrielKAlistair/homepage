import { hexCellScale } from "@/lib/hexgrid";
import { territoryCellRadius } from "./TrailLayout";
import { cellPaint, fabric, fabricOpacity } from "./territoryGrid";
import type { CellLook, Grid } from "./territoryGrid";
import { cellSpawn } from "./trailIntro";

// The fabric and the territories, drawn by the GPU (WebGL 1) in one pass over the canvas.
// For each pixel the fragment shader finds the hex cell it falls in, then draws the fabric's
// outline and, for a cell of the territory grid, that cell's fill and outline, read from two
// textures with one texel per cell. Each frame the page sends only the camera, and while the
// intro plays its clock: the shader times every cell's spawn from a third texture of start times.
// A cell changing owner fades from its old paint to its new one; that fade is computed here and
// the (small) textures re-uploaded each frame while it runs. Nothing is drawn while nothing changes.

const paintFadeMs = 200;
const maxPixelRatio = 2;

const vertexShader = `
attribute vec2 a_corner;
void main() { gl_Position = vec4(a_corner, 0.0, 1.0); }
`;

const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_size;        // canvas, CSS pixels
uniform float u_ratio;      // device pixels per CSS pixel
uniform vec3 u_camera;      // x, y, zoom: screen = map * zoom + (x, y)
uniform float u_radius;     // a cell's circumradius, map units
uniform float u_cellScale;  // cells are drawn this much smaller, leaving hairline gaps
uniform vec4 u_fabric;      // rgb, alpha
uniform vec4 u_grid;        // first column, first row, columns, rows
uniform sampler2D u_fill;   // per cell: rgb, fill alpha
uniform sampler2D u_stroke; // per cell: rgb, outline alpha
uniform sampler2D u_spawn;  // per cell: start time in ms, high byte and low byte
uniform float u_clock;      // seconds of intro played, or -1 when there is no intro
uniform vec2 u_spawnTiming; // duration, overshoot

vec4 over(vec4 below, vec3 rgb, float alpha) {
    return vec4(rgb * alpha + below.rgb * (1.0 - alpha), alpha + below.a * (1.0 - alpha));
}

// How much of a pixel (width px) at distance d from a line's centre the line (half-width w) covers
float line(float d, float w, float px) {
    return clamp(min(w, d + 0.5 * px) - max(-w, d - 0.5 * px), 0.0, px) / px;
}

float easeOutBack(float t) {
    float c = u_spawnTiming.y;
    return 1.0 + (c + 1.0) * pow(t - 1.0, 3.0) + c * pow(t - 1.0, 2.0);
}

void main() {
    vec2 css = vec2(gl_FragCoord.x, u_size.y * u_ratio - gl_FragCoord.y) / u_ratio;
    vec2 p = (css - u_camera.xy) / u_camera.z;

    // The nearest cell centre: flat-topped cells, odd columns shifted down half a row
    float columnWidth = 1.5 * u_radius;
    float rowHeight = sqrt(3.0) * u_radius;
    float nearest = 1e20;
    vec2 centre = vec2(0.0);
    vec2 cell = vec2(0.0);
    float column = floor(p.x / columnWidth + 0.5);
    for (int k = -1; k <= 1; k++) {
        float c = column + float(k);
        float shift = mod(c, 2.0) * 0.5 * rowHeight;
        float r = floor((p.y - shift) / rowHeight + 0.5);
        vec2 candidate = vec2(c * columnWidth, r * rowHeight + shift);
        float d = dot(p - candidate, p - candidate);
        if (d < nearest) {
            nearest = d;
            centre = candidate;
            cell = vec2(c, r);
        }
    }

    // h is the hexagon's own distance from the centre: the hexagon is where h <= its apothem
    vec2 q = abs(p - centre);
    float h = max(q.y, 0.8660254 * q.x + 0.5 * q.y);
    float apothem = 0.8660254 * u_radius * u_cellScale;
    float px = 1.0 / (u_camera.z * u_ratio); // one device pixel, in map units

    // The fabric's outline is one CSS pixel wide at every zoom
    vec4 colour = over(vec4(0.0), u_fabric.rgb, u_fabric.a * line(abs(h - apothem), 0.5 / u_camera.z, px));

    vec2 texel = cell - u_grid.xy;
    if (texel.x >= 0.0 && texel.y >= 0.0 && texel.x < u_grid.z && texel.y < u_grid.w) {
        vec2 uv = (texel + 0.5) / u_grid.zw;
        vec4 fill = texture2D(u_fill, uv);
        vec4 stroke = texture2D(u_stroke, uv);
        float scale = 1.0;
        float shown = 1.0;
        if (u_clock >= 0.0) {
            vec4 spawn = texture2D(u_spawn, uv);
            float start = (spawn.r * 65280.0 + spawn.g * 255.0) / 1000.0;
            float t = clamp((u_clock - start) / u_spawnTiming.x, 0.0, 1.0);
            scale = t > 0.0 ? easeOutBack(t) : 0.0;
            shown = t;
        }
        float edge = apothem * scale;
        colour = over(colour, fill.rgb, shown * fill.a * clamp((edge - h) / px + 0.5, 0.0, 1.0));
        // Outlines are one map unit wide, as the cells' SVG strokes were
        colour = over(colour, stroke.rgb, shown * stroke.a * line(abs(h - edge), 0.5 * scale, px));
    }
    gl_FragColor = colour;
}
`;

type Camera = { x: number; y: number; zoom: number };

// The paint of one cell: rgb (0-255), fill alpha, outline alpha
const paintSize = 5;

export class TerritoryRenderer {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram | null = null;
    private textures: { fill: WebGLTexture; stroke: WebGLTexture; spawn: WebGLTexture } | null = null;
    private uniforms: Record<string, WebGLUniformLocation | null> = {};
    private resizeObserver: ResizeObserver;
    private frame = 0;
    private lost = false;
    private dirty = true;
    private lastClock = -1;

    private camera: Camera = { x: 0, y: 0, zoom: 1 };
    private clock: (() => number) | null = null;

    // Cell state, by texel (row-major over the grid's columns and rows)
    private grid: Grid | null = null;
    private texelOf = new Int32Array(0); // grid cell index -> texel
    private from = new Float32Array(0);
    private to = new Float32Array(0);
    private fadeStart = new Float64Array(0);
    private fading = new Set<number>();
    private fillBytes = new Uint8Array(0);
    private strokeBytes = new Uint8Array(0);
    private spawnBytes: Uint8Array | null = null;
    private uploaded = false; // the textures hold the current bytes

    // Null when WebGL isn't available
    static create(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) return null;
        const renderer = new TerritoryRenderer(canvas, gl);
        return renderer.setUp() ? renderer : null;
    }

    private constructor(
        private canvas: HTMLCanvasElement,
        gl: WebGLRenderingContext
    ) {
        this.gl = gl;
        canvas.addEventListener("webglcontextlost", this.onContextLost);
        canvas.addEventListener("webglcontextrestored", this.onContextRestored);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
    }

    destroy() {
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
        this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
        const { gl } = this;
        if (this.textures) Object.values(this.textures).forEach((texture) => gl.deleteTexture(texture));
        if (this.program) gl.deleteProgram(this.program);
    }

    setCamera(camera: Camera) {
        this.camera = camera;
        this.invalidate();
    }

    // The intro's clock, in seconds, while it plays; null afterwards
    setClock(clock: (() => number) | null) {
        this.clock = clock;
        this.invalidate();
    }

    // The cells' owners. `spawn` holds each cell's intro start time in seconds (by grid cell
    // index), or is null when there's no intro. Cells whose paint changes fade to it, except when
    // the grid itself has changed: then every cell is new and simply shows its paint.
    paint(grid: Grid, looks: CellLook[], spawn: Float32Array | null) {
        const now = performance.now();
        const fresh = grid !== this.grid;
        if (fresh) this.allocate(grid);
        const target = new Float32Array(paintSize);
        grid.cells.forEach((_, i) => {
            const t = this.texelOf[i];
            const look = looks[i];
            const at = t * paintSize;
            if (look.color) {
                const { rgb, fill, stroke } = cellPaint(look.color, look);
                target.set([...rgb, fill, stroke]);
            } else {
                // Unowned: transparent, keeping the hue it fades out from
                target.set([this.to[at], this.to[at + 1], this.to[at + 2], 0, 0]);
            }
            if (!fresh && target.every((value, k) => value === this.to[at + k])) return;
            if (fresh) {
                this.from.set(target, at);
                this.to.set(target, at);
                this.write(t, target);
                return;
            }
            const shown = this.shown(t, now);
            // Fading in from transparent, take the new hue at once
            if (shown[3] === 0 && shown[4] === 0) shown.set(target.subarray(0, 3));
            this.from.set(shown, at);
            this.to.set(target, at);
            this.fadeStart[t] = now;
            this.fading.add(t);
        });
        if (spawn) {
            const bytes = new Uint8Array(this.texelOf.length * 4);
            spawn.forEach((seconds, i) => {
                const ms = Math.min(65535, Math.max(0, Math.round(seconds * 1000)));
                bytes.set([ms >> 8, ms & 255], this.texelOf[i] * 4);
            });
            this.spawnBytes = bytes;
        } else {
            this.spawnBytes = null;
        }
        this.uploaded = false;
        this.invalidate();
    }

    private allocate(grid: Grid) {
        const width = grid.cols[1] - grid.cols[0] + 1;
        const height = grid.rows[1] - grid.rows[0] + 1;
        const count = width * height;
        this.grid = grid;
        this.texelOf = new Int32Array(grid.cells.map((cell) => (cell.row - grid.rows[0]) * width + (cell.col - grid.cols[0])));
        this.from = new Float32Array(count * paintSize);
        this.to = new Float32Array(count * paintSize);
        this.fadeStart = new Float64Array(count);
        this.fading.clear();
        this.fillBytes = new Uint8Array(count * 4);
        this.strokeBytes = new Uint8Array(count * 4);
    }

    // A cell's paint as on screen now, partway through a fade or not
    private shown(t: number, now: number) {
        const at = t * paintSize;
        const progress = this.fading.has(t) ? Math.min(1, (now - this.fadeStart[t]) / paintFadeMs) : 1;
        const eased = progress * progress * (3 - 2 * progress);
        return this.from.subarray(at, at + paintSize).map((value, k) => value + (this.to[at + k] - value) * eased);
    }

    private write(t: number, paint: Float32Array) {
        const [r, g, b, fill, stroke] = paint;
        this.fillBytes.set([r, g, b, Math.round(fill * 255)], t * 4);
        this.strokeBytes.set([r, g, b, Math.round(stroke * 255)], t * 4);
    }

    private stepFades(now: number) {
        for (const t of this.fading) {
            this.write(t, this.shown(t, now));
            if (now - this.fadeStart[t] >= paintFadeMs) this.fading.delete(t);
        }
        this.uploaded = false;
    }

    private invalidate() {
        this.dirty = true;
        if (!this.frame && !this.lost) this.frame = requestAnimationFrame(this.render);
    }

    private render = (now: number) => {
        this.frame = 0;
        const fading = this.fading.size > 0;
        if (fading) this.stepFades(now);
        const clock = this.clock ? this.clock() : -1;
        if (this.dirty || fading || clock !== this.lastClock) this.draw(clock);
        this.dirty = false;
        this.lastClock = clock;
        // While the intro plays its clock is watched every frame; paused, nothing is redrawn
        if (fading || this.clock) this.frame = requestAnimationFrame(this.render);
    };

    private resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
        this.canvas.width = Math.round(this.canvas.clientWidth * ratio);
        this.canvas.height = Math.round(this.canvas.clientHeight * ratio);
        this.invalidate();
    }

    private draw(clock: number) {
        const { gl, canvas, uniforms: u } = this;
        if (!this.program || !this.textures) return;
        const ratio = canvas.width / Math.max(1, canvas.clientWidth);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(this.program);

        if (!this.uploaded && this.grid) {
            const width = this.grid.cols[1] - this.grid.cols[0] + 1;
            const height = this.grid.rows[1] - this.grid.rows[0] + 1;
            this.upload(this.textures.fill, width, height, this.fillBytes);
            this.upload(this.textures.stroke, width, height, this.strokeBytes);
            if (this.spawnBytes) this.upload(this.textures.spawn, width, height, this.spawnBytes);
            this.uploaded = true;
        }

        gl.uniform2f(u.size, canvas.clientWidth, canvas.clientHeight);
        gl.uniform1f(u.ratio, ratio);
        gl.uniform3f(u.camera, this.camera.x, this.camera.y, this.camera.zoom);
        gl.uniform1f(u.radius, territoryCellRadius);
        gl.uniform1f(u.cellScale, hexCellScale);
        gl.uniform4f(u.fabric, fabric.rgb[0] / 255, fabric.rgb[1] / 255, fabric.rgb[2] / 255, fabric.alpha * fabricOpacity(this.camera.zoom));
        const grid = this.grid;
        if (grid) gl.uniform4f(u.grid, grid.cols[0], grid.rows[0], grid.cols[1] - grid.cols[0] + 1, grid.rows[1] - grid.rows[0] + 1);
        else gl.uniform4f(u.grid, 0, 0, 0, 0);
        gl.uniform1f(u.clock, this.spawnBytes ? clock : -1);
        gl.uniform2f(u.spawnTiming, cellSpawn.duration, cellSpawn.overshoot);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    private upload(texture: WebGLTexture, width: number, height: number, bytes: Uint8Array) {
        const { gl } = this;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    }

    // Compiles the shaders and makes the textures; false if the GPU won't
    private setUp() {
        const { gl } = this;
        const compile = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };
        const program = gl.createProgram()!;
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
        this.program = program;
        gl.useProgram(program);

        // One triangle covering the whole canvas
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const corner = gl.getAttribLocation(program, "a_corner");
        gl.enableVertexAttribArray(corner);
        gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

        for (const name of ["size", "ratio", "camera", "radius", "cellScale", "fabric", "grid", "clock", "spawnTiming"]) {
            this.uniforms[name] = gl.getUniformLocation(program, `u_${name}`);
        }
        const texture = (unit: number, name: string) => {
            const made = gl.createTexture()!;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, made);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            gl.uniform1i(gl.getUniformLocation(program, `u_${name}`), unit);
            return made;
        };
        this.textures = { fill: texture(0, "fill"), stroke: texture(1, "stroke"), spawn: texture(2, "spawn") };
        // Each texture stays bound to its own unit; uploads rebind on the same unit
        this.uploaded = false;
        this.resize();
        return true;
    }

    private onContextLost = (event: Event) => {
        event.preventDefault();
        this.lost = true;
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.program = null;
        this.textures = null;
    };

    private onContextRestored = () => {
        this.lost = false;
        this.setUp();
    };
}
