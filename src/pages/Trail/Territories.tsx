import { memo, useId, useLayoutEffect, useMemo, useRef } from "react";
import { useStore } from "@xyflow/react";
import { HexPattern } from "@/components/hexgrid";
import { territoryCellRadius as radius } from "./TrailLayout";
import { buildGrid, cellPaint, computeLabels, computeOwners, gridExtent, hexPoints, labelColors } from "./territoryGrid";
import type { TerritoryChapter } from "./territoryGrid";

// The hex fabric behind the trail, and the territories coloured into it (see territoryGrid.ts).

// The bare fabric: every cell, faintly, everywhere. It fades out when zoomed far out, where the
// cells would shrink to a few pixels and shimmer.
const fabricStroke = "rgba(255, 255, 255, 0.055)";
const fabricOpacity = (zoom: number) => Math.min(1, Math.max(0, (zoom - 0.2) / 0.25));

const transformSelector = (state: { transform: [number, number, number] }) => state.transform;

const Territories = ({ chapters }: { chapters: TerritoryChapter[] }) => {
    const [tx, ty, zoom] = useStore(transformSelector);
    const fabricId = `trail-fabric-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
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
            const paint = cellPaint(look.color, look);
            polygon.style.fill = paint.fill;
            polygon.style.stroke = paint.stroke;
        }
    }, [looks]);

    return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }} aria-hidden="true">
            <defs>
                {/* Lines stay one screen pixel wide at every zoom */}
                <HexPattern id={fabricId} radius={radius} transform={`translate(${tx} ${ty}) scale(${zoom})`} stroke={fabricStroke} strokeWidth={1 / zoom} />
            </defs>
            <rect width="100%" height="100%" fill={`url(#${fabricId})`} opacity={fabricOpacity(zoom)} />
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
