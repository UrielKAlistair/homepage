import { memo, useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore, useStoreApi } from "@xyflow/react";
import { HexPattern } from "@/components/hexgrid";
import { territoryCellRadius as radius, territoryReach } from "./TrailLayout";
import { buildGrid, computeLabels, computeOwners, fabric, fabricOpacity, gridExtent, labelColors } from "./territoryGrid";
import type { TerritoryChapter } from "./territoryGrid";
import { TerritoryRenderer } from "./territoryRenderer";
import { TrailIntroTiming, cellSpawn } from "./trailIntro";
import type { CameraFeed } from "./phonePanZoom";

// The hex fabric behind the trail, and the territories coloured into it (see territoryGrid.ts),
// drawn on a WebGL canvas (territoryRenderer.ts); the domain labels sit above it as SVG text.
// Without WebGL the map shows the bare fabric only, as an SVG pattern.

const transformSelector = (state: { transform: [number, number, number] }) => state.transform;

// `camera`, on the phone, moves the territory and its labels during a gesture, before React Flow's store knows
const Territories = ({ chapters, camera }: { chapters: TerritoryChapter[]; camera: CameraFeed }) => {
    const intro = useContext(TrailIntroTiming);
    const store = useStoreApi();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<TerritoryRenderer | null>(null);
    const [webgl, setWebgl] = useState(true);

    // The grid only changes when chapters move into a new block of cells
    const gridKey = chapters.length === 0 ? "" : Object.values(gridExtent(chapters)).flat().join(",");
    const grid = useMemo(() => {
        if (!gridKey) return null;
        const [c0, c1, r0, r1] = gridKey.split(",").map(Number);
        return buildGrid({ cols: [c0, c1], rows: [r0, r1] });
    }, [gridKey]);
    const looks = useMemo(() => (grid ? computeOwners(grid, chapters) : null), [grid, chapters]);
    const labels = useMemo(() => (grid && looks ? computeLabels(grid, looks, chapters) : []), [grid, looks, chapters]);

    // Drawing in, each owned cell starts after its chapter's territory, later the farther it is
    // from the chapter, give or take a little
    const spawn = useMemo(() => {
        if (!intro || !grid || !looks) return null;
        return Float32Array.from(grid.cells, (cell, i) => {
            const look = looks[i];
            if (!look.owner) return 0;
            const jitter = ((Math.imul(cell.col, 73856093) ^ Math.imul(cell.row, 19349663)) >>> 0) / 2 ** 32;
            return intro.territory(look.owner) + cellSpawn.spread * (look.distance / territoryReach) + cellSpawn.jitter * jitter;
        });
    }, [intro, grid, looks]);

    // The renderer lives as long as the canvas, and follows the camera without re-rendering React
    useLayoutEffect(() => {
        const renderer = TerritoryRenderer.create(canvasRef.current!);
        if (!renderer) {
            setWebgl(false);
            return;
        }
        rendererRef.current = renderer;
        const follow = ({ transform: [x, y, zoom] }: { transform: [number, number, number] }) => renderer.setCamera({ x, y, zoom });
        follow(store.getState());
        const unsubscribe = store.subscribe(follow);
        return () => {
            unsubscribe();
            renderer.destroy();
            rendererRef.current = null;
        };
    }, [store]);

    useLayoutEffect(() => camera.subscribe((next) => rendererRef.current?.setCamera(next)), [camera]);

    useLayoutEffect(() => {
        if (grid && looks) rendererRef.current?.paint(grid, looks, spawn);
    }, [grid, looks, spawn]);

    useLayoutEffect(() => rendererRef.current?.setClock(intro ? intro.elapsed : null), [intro]);

    return (
        <>
            {webgl ? <canvas ref={canvasRef} className={`${layer} ${intro ? "ti-fade" : ""}`} style={{ zIndex: 0 }} aria-hidden="true" /> : <FabricFallback />}
            {webgl && <TerritoryLabels labels={labels} camera={camera} />}
        </>
    );
};

const TerritoryLabels = ({ labels, camera }: { labels: ReturnType<typeof computeLabels>; camera: CameraFeed }) => {
    const [tx, ty, zoom] = useStore(transformSelector);
    const group = useRef<SVGGElement>(null);
    useLayoutEffect(() => camera.subscribe(({ x, y, zoom }) => group.current?.setAttribute("transform", `translate(${x} ${y}) scale(${zoom})`)), [camera]);
    const intro = useContext(TrailIntroTiming);
    return (
        <svg className={`${layer} ${intro ? "ti-fade" : ""}`} style={{ zIndex: 0, ...(intro ? { animationDelay: `${intro.labels}s` } : {}) }} aria-hidden="true">
            <g ref={group} transform={`translate(${tx} ${ty}) scale(${zoom})`}>
                {labels.map((label) => (
                    <text key={label.color} x={label.x} y={label.y} fill={labelColors[label.color]} className="trail-territory-label">
                        {label.text}
                    </text>
                ))}
            </g>
        </svg>
    );
};

// The bare fabric as an SVG pattern, for browsers without WebGL
const fabricStroke = `rgba(${fabric.rgb.join(", ")}, ${fabric.alpha})`;
const FabricFallback = () => {
    const [tx, ty, zoom] = useStore(transformSelector);
    const intro = useContext(TrailIntroTiming);
    const fabricId = `trail-fabric-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    return (
        <svg className={`${layer} ${intro ? "ti-fade" : ""}`} style={{ zIndex: 0 }} aria-hidden="true">
            <defs>
                {/* Lines stay one screen pixel wide at every zoom */}
                <HexPattern id={fabricId} radius={radius} transform={`translate(${tx} ${ty}) scale(${zoom})`} stroke={fabricStroke} strokeWidth={1 / zoom} />
            </defs>
            <rect width="100%" height="100%" fill={`url(#${fabricId})`} opacity={fabricOpacity(zoom)} />
        </svg>
    );
};

const layer = "pointer-events-none absolute inset-0 h-full w-full";

export default memo(Territories);
