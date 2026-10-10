import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useStore } from "@xyflow/react";
import type { TrailColor } from "./TrailData";
import { domains } from "./TrailData";
import type { Rect } from "./TrailLayout";

// Hexagonal territories behind the chapters. Every cell asks one question: which chapter am I
// closest to? The answer depends only on where the chapters are right now, so any arrangement,
// overlaps included, always draws the same way and fully reverts when things move apart.

export type TerritoryChapter = { id: string; rect: Rect; color: TrailColor; z: number };

const radius = 22; // circumradius of a flat-topped hex cell, in flow units
const reach = 52; // how far a territory extends beyond its chapter's edge
const cellScale = 0.9; // cells are drawn slightly small, leaving hairline gaps
const rowHeight = Math.sqrt(3) * radius;
const columnWidth = 1.5 * radius;
const gridBlock = 8; // the grid grows in blocks of cells, so dragging rarely rebuilds it

const rgb: Record<TrailColor, string> = {
    orange: "251, 146, 60",
    red: "248, 113, 113",
    blue: "96, 165, 250",
};
// Solid but muted, so labels read as part of the background
const labelColors: Record<TrailColor, string> = {
    orange: "#b9875f",
    red: "#b67272",
    blue: "#7193c2",
};
const labelFontSize = 13;
const labelCharWidth = labelFontSize * 0.9; // glyph plus 0.3em tracking, a slight overestimate

const hexPoints = (() => {
    const r = radius * cellScale;
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i;
        return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
    }).join(" ");
})();

const cellCentre = (col: number, row: number) => ({
    x: col * columnWidth,
    y: row * rowHeight + (Math.abs(col) % 2 === 1 ? rowHeight / 2 : 0),
});

// The six neighbours of a flat-topped cell in "odd columns shifted down" offset coordinates
const neighbours = (col: number, row: number): [number, number][] => {
    const shifted = Math.abs(col) % 2 === 1;
    return [
        [col, row - 1],
        [col, row + 1],
        [col - 1, shifted ? row : row - 1],
        [col - 1, shifted ? row + 1 : row],
        [col + 1, shifted ? row : row - 1],
        [col + 1, shifted ? row + 1 : row],
    ];
};

const distanceToRect = (x: number, y: number, r: Rect) => {
    const dx = Math.max(r.x - x, 0, x - (r.x + r.width));
    const dy = Math.max(r.y - y, 0, y - (r.y + r.height));
    return Math.hypot(dx, dy);
};

type GridCell = { key: string; col: number; row: number; x: number; y: number };
type Grid = { cols: [number, number]; rows: [number, number]; cells: GridCell[] };

// Covers the chapters plus reach, rounded out to whole blocks
function gridExtent(chapters: TerritoryChapter[]) {
    const block = (value: number, size: number, round: (n: number) => number) => round(value / size / gridBlock) * gridBlock;
    const cols: [number, number] = [
        block(Math.min(...chapters.map((c) => c.rect.x)) - reach - radius, columnWidth, Math.floor),
        block(Math.max(...chapters.map((c) => c.rect.x + c.rect.width)) + reach + radius, columnWidth, Math.ceil),
    ];
    const rows: [number, number] = [
        block(Math.min(...chapters.map((c) => c.rect.y)) - reach - radius, rowHeight, Math.floor),
        block(Math.max(...chapters.map((c) => c.rect.y + c.rect.height)) + reach + radius, rowHeight, Math.ceil),
    ];
    return { cols, rows };
}

function buildGrid({ cols, rows }: { cols: [number, number]; rows: [number, number] }): Grid {
    const cells: GridCell[] = [];
    for (let col = cols[0]; col <= cols[1]; col++) {
        for (let row = rows[0]; row <= rows[1]; row++) cells.push({ key: `${col},${row}`, col, row, ...cellCentre(col, row) });
    }
    return { cols, rows, cells };
}

type CellLook = { color?: TrailColor; level: number; frontier: boolean };

function computeOwners(grid: Grid, chapters: TerritoryChapter[]) {
    const looks = new Map<string, CellLook>();
    for (const cell of grid.cells) {
        let best: TerritoryChapter | undefined;
        let bestDistance = Infinity;
        for (const chapter of chapters) {
            const d = distanceToRect(cell.x, cell.y, chapter.rect);
            // Ties (e.g. a cell under two overlapping chapters) go to the one on top
            if (d < bestDistance - 0.5 || (Math.abs(d - bestDistance) <= 0.5 && best && chapter.z > best.z)) {
                best = chapter;
                bestDistance = d;
            }
        }
        const owned = best && bestDistance <= reach;
        // Three strength levels: under or beside a chapter, nearby, at the edge of reach
        const level = !owned ? 0 : bestDistance < reach / 3 ? 3 : bestDistance < (reach * 2) / 3 ? 2 : 1;
        looks.set(cell.key, { color: owned ? best!.color : undefined, level, frontier: false });
    }
    for (const cell of grid.cells) {
        const look = looks.get(cell.key)!;
        if (look.color) look.frontier = neighbours(cell.col, cell.row).some(([c, r]) => looks.get(`${c},${r}`)?.color !== look.color);
    }
    return looks;
}

// One label per domain, at the top-left of its largest connected territory, where the whole
// label sits clear of every chapter
function computeLabels(grid: Grid, looks: Map<string, CellLook>, chapters: TerritoryChapter[]) {
    const byKey = new Map(grid.cells.map((cell) => [cell.key, cell]));
    const seen = new Set<string>();
    const largest = new Map<TrailColor, GridCell[]>();
    for (const cell of grid.cells) {
        const color = looks.get(cell.key)!.color;
        if (!color || seen.has(cell.key)) continue;
        const region: GridCell[] = [];
        const queue = [cell];
        seen.add(cell.key);
        while (queue.length > 0) {
            const current = queue.pop()!;
            region.push(current);
            for (const [c, r] of neighbours(current.col, current.row)) {
                const next = byKey.get(`${c},${r}`);
                if (next && looks.get(next.key)!.color === color && !seen.has(next.key)) {
                    seen.add(next.key);
                    queue.push(next);
                }
            }
        }
        if (region.length > (largest.get(color)?.length ?? 0)) largest.set(color, region);
    }

    const labels: { color: TrailColor; x: number; y: number; text: string }[] = [];
    for (const [color, region] of largest) {
        const text = domains.find((d) => d.color === color)?.label.toUpperCase();
        if (!text) continue;
        const width = text.length * labelCharWidth;
        const clearOf = (x: number, y: number) =>
            chapters.every((c) => x + width < c.rect.x - 8 || x > c.rect.x + c.rect.width + 8 || y < c.rect.y - 8 || y - labelFontSize > c.rect.y + c.rect.height + 8);
        const spot = [...region]
            .sort((a, b) => a.y - b.y || a.x - b.x)
            .map((cell) => ({ x: cell.x - radius * 0.6, y: cell.y + 4 }))
            .find(({ x, y }) => clearOf(x, y));
        if (spot) labels.push({ color, ...spot, text });
    }
    return labels;
}

const transformSelector = (state: { transform: [number, number, number] }) => state.transform;

const Territories = ({ chapters }: { chapters: TerritoryChapter[] }) => {
    const [tx, ty, zoom] = useStore(transformSelector);
    const layerRef = useRef<SVGGElement>(null);
    const applied = useRef(new Map<string, string>());

    // The grid only changes when chapters move into a new block of cells
    const gridKey = chapters.length === 0 ? "" : Object.values(gridExtent(chapters)).flat().join(",");
    const grid = useMemo(() => {
        if (!gridKey) return null;
        const [c0, c1, r0, r1] = gridKey.split(",").map(Number);
        return buildGrid({ cols: [c0, c1], rows: [r0, r1] });
    }, [gridKey]);

    // The same element list for the same grid, so React skips the cells entirely on a drag frame
    const cellElements = useMemo(
        () =>
            grid?.cells.map((cell) => (
                <polygon key={cell.key} data-key={cell.key} points={hexPoints} transform={`translate(${cell.x} ${cell.y})`} className="trail-territory-cell" />
            )),
        [grid]
    );

    const looks = useMemo(() => (grid ? computeOwners(grid, chapters) : null), [grid, chapters]);
    const labels = useMemo(() => (grid && looks ? computeLabels(grid, looks, chapters) : []), [grid, looks, chapters]);

    // Colours are set directly on the cells that changed, so a drag doesn't re-render ~2000 elements
    useLayoutEffect(() => {
        const layer = layerRef.current;
        if (!layer || !looks) return;
        if (applied.current.size > 0 && layer.childElementCount !== applied.current.size) applied.current.clear();
        for (const polygon of layer.children as HTMLCollectionOf<SVGPolygonElement>) {
            const key = polygon.dataset.key!;
            const look = looks.get(key);
            if (!look) continue;
            const signature = `${look.color ?? ""}${look.level}${look.frontier ? "f" : ""}`;
            if (applied.current.get(key) === signature) continue;
            applied.current.set(key, signature);
            if (!look.color) {
                polygon.style.fill = "transparent";
                polygon.style.stroke = "transparent";
                continue;
            }
            const fillOpacity = 0.012 + look.level * 0.012 + (look.frontier ? 0.012 : 0);
            const strokeOpacity = 0.05 + look.level * 0.03 + (look.frontier ? 0.06 : 0);
            polygon.style.fill = `rgba(${rgb[look.color]}, ${fillOpacity})`;
            polygon.style.stroke = `rgba(${rgb[look.color]}, ${strokeOpacity})`;
        }
    }, [looks]);

    return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }} aria-hidden="true">
            <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
                <g ref={layerRef}>{cellElements}</g>
                {labels.map((label) => (
                    <text key={label.color} x={label.x} y={label.y} fill={labelColors[label.color]} className="trail-territory-label">
                        {label.text}
                    </text>
                ))}
            </g>
        </svg>
    );
};

export default memo(Territories);
