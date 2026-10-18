import { useEffect, useId, useRef, useState } from "react";
import { rewindMs } from "@/lib/playback";
import { HexPattern } from "@/components/hexgrid";
import { hexPoints as hexPolygon } from "@/lib/hexgrid";
import { chapters } from "../Trail/TrailData";
import { chapterSize, circleSize, directPrerequisites, layoutTrail, panelHeaderHeight, previewFraming, territoryCellRadius, territoryReach, visibleArea, visibleEdges } from "../Trail/TrailLayout";
import { loadArrangement } from "../Trail/trailStorage";
import type { Rect, Size } from "../Trail/TrailLayout";
import { buildGrid, cellPaint, computeLabels, computeOwners, gridExtent, labelColors, rgb } from "../Trail/territoryGrid";

// The trail drawing itself, as the Trail page will show it (the fresh layout, or the visitor's own
// arrangement): the hex fabric appears, chapters arrive left to right, each territory spreads
// outward from its chapter, then the arrows draw in. It shows a close view of the map's top-left
// corner (`previewFraming`, for a canvas of `canvas` size); the Trail page opens on exactly
// this view and zooms out from it, so the view carries on unbroken.
// All timing is CSS animation delays. They run only while `active`; coming back to an unfinished
// drawing steps it back by rewindMs first.

const prerequisites = directPrerequisites(chapters);
const chapterIds = chapters.map((c) => c.id);
const circleInset = (chapterSize.width - circleSize) / 2;
const hexPoints = hexPolygon(territoryCellRadius);

const chapterStart = 0.35; // s, first chapter
const chapterStagger = 0.09;
const spreadTime = 0.6; // s for a territory to reach its full extent
const topicStagger = 0.06;

type Anchor = { x: number; y: number };
type Drawing = {
    viewBox: Rect;
    chapterBoxes: { id: string; rect: Rect; open: boolean; title: string; rgb: string; delay: number }[];
    topicBoxes: { id: string; rect: Rect; title: string; rgb: string; delay: number }[];
    cells: { key: string; x: number; y: number; fill: string; stroke: string; delay: number }[];
    edges: { id: string; d: string; soft: boolean; delay: number }[];
    labels: { key: string; x: number; y: number; text: string; color: string }[];
    end: number; // s, when the last thing has arrived
};

// Edges leave an open chapter at its header line and a collapsed one at its circle; topics use
// whichever side the handle names
function anchorOf(id: string, handle: string, chapterRects: Map<string, Rect>, topicRects: Map<string, Rect>, open: Set<string>): Anchor {
    const topic = topicRects.get(id);
    if (topic) {
        if (handle === "flow-out") return { x: topic.x + topic.width / 2, y: topic.y + topic.height };
        if (handle === "flow-in") return { x: topic.x + topic.width / 2, y: topic.y };
        return { x: handle === "out" ? topic.x + topic.width : topic.x, y: topic.y + topic.height / 2 };
    }
    const chapter = chapterRects.get(id)!;
    if (!open.has(id)) return { x: handle === "out" ? chapter.x + chapter.width - circleInset : chapter.x + circleInset, y: chapter.y + circleSize / 2 };
    return { x: handle === "out" ? chapter.x + chapter.width : chapter.x, y: chapter.y + panelHeaderHeight / 2 };
}

const curve = (from: Anchor, to: Anchor, vertical: boolean) => {
    if (vertical) {
        const dy = Math.max(20, Math.abs(to.y - from.y) / 2);
        return `M${from.x},${from.y} C${from.x},${from.y + dy} ${to.x},${to.y - dy} ${to.x},${to.y}`;
    }
    const dx = Math.max(40, Math.abs(to.x - from.x) / 2);
    return `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`;
};

async function drawTrail(canvas: Size): Promise<Drawing> {
    const { placements } = await layoutTrail(chapters, prerequisites, canvas.width / canvas.height);
    const saved = loadArrangement(chapterIds);
    const open = new Set(chapterIds.filter((id) => (saved ? saved.chapters[id].open : true)));
    const stacking = saved && saved.order.length === chapterIds.length ? saved.order : chapterIds; // back to front

    const chapterRects = new Map(
        chapters.map((c) => {
            const position = saved ? { x: saved.chapters[c.id].x, y: saved.chapters[c.id].y } : placements[c.id].position;
            return [c.id, { ...position, ...(open.has(c.id) ? placements[c.id].openSize : chapterSize) }];
        })
    );
    const order = [...chapters].sort((a, b) => chapterRects.get(a.id)!.x - chapterRects.get(b.id)!.x || chapterRects.get(a.id)!.y - chapterRects.get(b.id)!.y);
    const arrival = new Map(order.map((c, rank) => [c.id, chapterStart + rank * chapterStagger]));

    const topicRects = new Map<string, Rect>();
    const topicBoxes: Drawing["topicBoxes"] = [];
    for (const chapter of chapters.filter((c) => open.has(c.id))) {
        const panel = chapterRects.get(chapter.id)!;
        placements[chapter.id].topics.forEach((topic, i) => {
            const rect = { x: panel.x + topic.position.x, y: panel.y + topic.position.y, width: Number(topic.style!.width), height: Number(topic.style!.height) };
            topicRects.set(topic.id, rect);
            topicBoxes.push({ id: topic.id, rect, title: topic.data.title, rgb: rgb[chapter.color], delay: arrival.get(chapter.id)! + 0.2 + i * topicStagger });
        });
    }

    const territory = chapters.map((c) => ({ id: c.id, rect: chapterRects.get(c.id)!, color: c.color, z: stacking.indexOf(c.id) }));
    const grid = buildGrid(gridExtent(territory));
    const looks = computeOwners(grid, territory);
    const cells = grid.cells.flatMap((cell, i) => {
        const look = looks[i];
        if (!look.color || !look.owner) return [];
        const delay = arrival.get(look.owner)! + 0.1 + (look.distance / territoryReach) * spreadTime;
        return [{ key: cell.key, x: cell.x, y: cell.y, ...cellPaint(look.color, look), delay }];
    });

    const edges = visibleEdges(prerequisites, open, chapters).map((edge) => {
        const from = anchorOf(edge.source, edge.sourceHandle!, chapterRects, topicRects, open);
        const to = anchorOf(edge.target, edge.targetHandle!, chapterRects, topicRects, open);
        const ready = Math.max(arrival.get(edge.source.split("/")[0])!, arrival.get(edge.target.split("/")[0])!);
        return { id: edge.id, d: curve(from, to, edge.sourceHandle === "flow-out"), soft: !!edge.data?.soft, delay: ready + 0.45 };
    });

    const labels = computeLabels(grid, looks, territory).map((label) => ({ key: label.color, x: label.x, y: label.y, text: label.text, color: labelColors[label.color] }));
    const last = Math.max(...edges.map((e) => e.delay), ...cells.map((c) => c.delay), 0);

    return {
        viewBox: visibleArea(previewFraming(chapters.map((c) => ({ rect: chapterRects.get(c.id)!, color: c.color })), canvas), canvas),
        chapterBoxes: stacking.map((id) => {
            const c = chapters.find((chapter) => chapter.id === id)!;
            return { id, rect: chapterRects.get(id)!, open: open.has(id), title: c.title, rgb: rgb[c.color], delay: arrival.get(id)! };
        }),
        topicBoxes,
        cells,
        edges,
        labels,
        end: last + 0.6,
    };
}

const at = (delay: number) => ({ animationDelay: `${delay.toFixed(2)}s` });

type TrailPreviewProps = {
    canvas: Size; // the Trail page's canvas
    active: boolean;
    complete?: boolean; // already played this visit: show it finished, without animating
    onDrawn?: () => void; // the drawing exists (it's laid out asynchronously)
    onFinished?: () => void;
};

const TrailPreview = ({ canvas, active, complete = false, onDrawn, onFinished }: TrailPreviewProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [playing, setPlaying] = useState(active);
    // Once finished, the animations are removed, so pausing and rewinding can't touch it again
    const [done, setDone] = useState(complete);
    const [drawing, setDrawing] = useState<Drawing | null>(null);
    const fabricId = `preview-fabric-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

    useEffect(() => {
        let cancelled = false;
        drawTrail(canvas).then((result) => !cancelled && setDrawing(result));
        return () => {
            cancelled = true;
        };
    }, [canvas]);

    useEffect(() => {
        if (drawing) onDrawn?.();
    }, [drawing, onDrawn]);

    // Rewind only what hasn't finished, before the class change resumes it
    useEffect(() => {
        if (active && !done && svgRef.current) {
            for (const animation of svgRef.current.getAnimations({ subtree: true })) {
                const end = animation.effect?.getComputedTiming().endTime;
                const time = animation.currentTime;
                if (typeof time === "number" && typeof end === "number" && time < end) {
                    animation.currentTime = Math.max(0, time - rewindMs);
                }
            }
        }
        setPlaying(active);
    }, [active, done]);

    useEffect(() => {
        if (!drawing || done || !svgRef.current) return;
        let cancelled = false;
        Promise.all(svgRef.current.getAnimations({ subtree: true }).map((animation) => animation.finished))
            .then(() => {
                if (cancelled) return;
                setDone(true);
                onFinished?.();
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [drawing, done, onFinished]);

    if (!drawing) return null;
    const { viewBox } = drawing;
    return (
        <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            ref={svgRef}
            className={`trail-preview h-full w-full ${playing ? "playing" : ""} ${done ? "done" : ""}`}
            aria-label="A preview of the trail: chapters of what I've been learning, grouped into domains"
            role="img"
        >
            <defs>
                <HexPattern id={fabricId} radius={territoryCellRadius} stroke="rgba(255, 255, 255, 0.05)" />
            </defs>
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill={`url(#${fabricId})`} className="tp-fade" />

            {drawing.cells.map((cell) => (
                <polygon key={cell.key} points={hexPoints} transform={`translate(${cell.x} ${cell.y})`} fill={cell.fill} stroke={cell.stroke} className="tp-fade" style={at(cell.delay)} />
            ))}

            {drawing.labels.map((label) => (
                <text key={label.key} x={label.x} y={label.y} fill={label.color} className="trail-territory-label tp-fade" style={at(drawing.end - 0.4)}>
                    {label.text}
                </text>
            ))}

            {drawing.chapterBoxes.map((box) => (
                <g key={box.id} className="tp-rise" style={{ ...at(box.delay), transformOrigin: `${box.rect.x + box.rect.width / 2}px ${box.rect.y}px` }}>
                    {box.open ? (
                        <>
                        <rect x={box.rect.x} y={box.rect.y} width={box.rect.width} height={box.rect.height} rx={24} fill="rgba(10, 16, 32, 0.85)" stroke={`rgba(${box.rgb}, 0.3)`} />
                        <line x1={box.rect.x} x2={box.rect.x + box.rect.width} y1={box.rect.y + panelHeaderHeight} y2={box.rect.y + panelHeaderHeight} stroke="rgba(255, 255, 255, 0.06)" />
                        <circle cx={box.rect.x + 25} cy={box.rect.y + panelHeaderHeight / 2} r={5} fill={`rgb(${box.rgb})`} />
                        <text x={box.rect.x + 42} y={box.rect.y + panelHeaderHeight / 2 + 5.5} fill="white" fontSize={16} fontWeight={600}>
                            {box.title}
                        </text>
                        </>
                    ) : (
                        <>
                            <circle cx={box.rect.x + box.rect.width / 2} cy={box.rect.y + circleSize / 2} r={circleSize / 2 - 1} fill={`rgb(${box.rgb})`} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={2} />
                            <text x={box.rect.x + box.rect.width / 2} y={box.rect.y + circleSize + 22} textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize={14} fontWeight={500}>
                                {box.title}
                            </text>
                        </>
                    )}
                </g>
            ))}

            {drawing.topicBoxes.map((box) => (
                <g key={box.id} className="tp-fade" style={at(box.delay)}>
                    <rect x={box.rect.x} y={box.rect.y} width={box.rect.width} height={box.rect.height} rx={12} fill="rgba(255, 255, 255, 0.04)" stroke="rgba(255, 255, 255, 0.1)" />
                    <circle cx={box.rect.x + 17} cy={box.rect.y + box.rect.height / 2} r={3} fill={`rgb(${box.rgb})`} />
                    <text x={box.rect.x + 30} y={box.rect.y + box.rect.height / 2 + 5} fill="rgba(255, 255, 255, 0.85)" fontSize={14}>
                        {box.title}
                    </text>
                </g>
            ))}

            {drawing.edges.map((edge) => (
                <path
                    key={edge.id}
                    d={edge.d}
                    pathLength={1}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.32)"
                    strokeWidth={1.5}
                    className={edge.soft ? "tp-fade" : "tp-draw"}
                    strokeDasharray={edge.soft ? "0.02 0.025" : undefined}
                    style={at(edge.delay)}
                />
            ))}
        </svg>
    );
};

export default TrailPreview;
