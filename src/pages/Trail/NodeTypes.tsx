import { useContext } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BaseEdge, Handle, Position, getBezierPath, useReactFlow } from "@xyflow/react";
import type { Edge, EdgeProps, Node, NodeProps } from "@xyflow/react";
import { ArrowUpRight } from "lucide-react";
import type { TrailColor } from "./TrailData";
import { panelHeaderHeight } from "./TrailLayout";
import { TrailActions, chapterColors } from "./TrailTheme";
import { TrailIntroTiming } from "./trailIntro";
import { notebooks, notesPath } from "../Notes/notesIndex";

export type ChapterNodeData = {
    title: string;
    color: TrailColor;
    topicCount: number;
    notes?: string;
};

export type TopicNodeData = {
    title: string;
    color: TrailColor;
    direction: "DOWN" | "RIGHT";
    index: number; // in its chapter's list
    notes?: string;
};

// Notes open in a new tab, so the visitor's arrangement of the trail stays as it was.
// A slug with no notebook behind it (yet) shows nothing.
const notesLink = (slug?: string) => (slug && notebooks[slug] ? { href: notesPath(slug), target: "_blank", rel: "noopener" } : null);

// A chapter is a frosted sheet: whatever it's dragged over shows blurred through it.
// Edges meet the middle of its sides.
export const ChapterNode = ({ id, data }: NodeProps<Node<ChapterNodeData>>) => {
    const colors = chapterColors[data.color];
    const { focusChapter, flyToChapter } = useContext(TrailActions);
    const notes = notesLink(data.notes);
    const intro = useContext(TrailIntroTiming);

    return (
        <div className="relative h-full w-full" onPointerDownCapture={() => focusChapter(id)}>
            {/* React Flow measures where handles sit on screen, so they stay out of anything that moves */}
            <Handle id="in" type="target" position={Position.Left} className="!invisible" />
            <Handle id="out" type="source" position={Position.Right} className="!invisible" />

            <div
                className={`absolute inset-0 cursor-grab overflow-hidden rounded-3xl border bg-card/80 active:cursor-grabbing shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md ${colors.panel} ${intro ? "ti-rise" : ""}`}
                style={intro ? { animationDelay: `${intro.chapter(id)}s` } : undefined}
            >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent to-60% ${colors.tint}`} />
                <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5" style={{ height: panelHeaderHeight }}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                    <button
                        type="button"
                        onClick={() => flyToChapter(id)}
                        title="Zoom to this chapter"
                        className="truncate text-base font-semibold text-white decoration-white/30 underline-offset-4 hover:underline"
                    >
                        {data.title}
                    </button>
                    {data.topicCount > 0 && (
                        <span className="shrink-0 text-xs text-white/40">
                            {data.topicCount} {data.topicCount === 1 ? "topic" : "topics"}
                        </span>
                    )}
                </div>
                {data.topicCount === 0 &&
                    (notes ? (
                        <a
                            {...notes}
                            className="relative mx-5 mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 transition-colors hover:border-white/35 hover:text-white"
                        >
                            Read the notes
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    ) : (
                        <p className="relative px-5 pt-6 text-sm text-white/40">Notes for this chapter are on their way.</p>
                    ))}
            </div>
        </div>
    );
};

// Below this many screen pixels a press is a click, not a drag
const dragThreshold = 4;

export const TopicNode = ({ data, parentId }: NodeProps<Node<TopicNodeData>>) => {
    const notes = notesLink(data.notes);
    const intro = useContext(TrailIntroTiming);
    const { focusChapter, moveChapterBy, saveArrangement } = useContext(TrailActions);
    const { getZoom } = useReactFlow();

    // Topics stay fixed in their panel; dragging one drags its chapter. Screen movement is divided
    // by the zoom, so the panel stays under the cursor at any zoom level.
    const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
        if (!parentId || event.button !== 0) return;
        focusChapter(parentId);
        const target = event.currentTarget;
        const start = { x: event.clientX, y: event.clientY };
        let last = start;
        let dragging = false;
        const move = (e: PointerEvent) => {
            if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) < dragThreshold) return;
            dragging = true;
            const zoom = getZoom();
            moveChapterBy(parentId, (e.clientX - last.x) / zoom, (e.clientY - last.y) / zoom);
            last = { x: e.clientX, y: e.clientY };
        };
        const end = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            if (!dragging) return;
            // The click that ends a drag (if any; it comes before timers run) shouldn't open the notes
            const block = (e: Event) => e.preventDefault();
            target.addEventListener("click", block, { capture: true });
            setTimeout(() => target.removeEventListener("click", block, { capture: true }), 0);
            saveArrangement();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
    };

    // Topics with notes are links; the rest are plain labels for now. The handles sit beside the
    // body, not in it: React Flow measures them on screen, and the body animates.
    const Body = notes ? "a" : "div";
    return (
        <>
            {/* Links across chapters run left to right; links inside a chapter follow its own direction */}
            <Handle id="in" type="target" position={Position.Left} className="!invisible" />
            <Handle id="flow-in" type="target" position={data.direction === "DOWN" ? Position.Top : Position.Left} className="!invisible" />
            <Handle id="out" type="source" position={Position.Right} className="!invisible" />
            <Handle id="flow-out" type="source" position={data.direction === "DOWN" ? Position.Bottom : Position.Right} className="!invisible" />
            <Body
                {...notes}
                title={notes ? `Read the notes on ${data.title}` : undefined}
                onPointerDown={startDrag}
                draggable={false}
                style={intro && parentId ? { animationDelay: `${intro.topic(parentId, data.index)}s` } : undefined}
                className={`nopan flex h-full w-full touch-none select-none items-center gap-2.5 rounded-xl border px-3.5 text-sm transition-colors ${notes ? "group cursor-pointer border-white/15 bg-white/[0.06] text-white/90 hover:border-white/40 hover:bg-white/[0.12] hover:text-white" : "cursor-grab border-white/[0.07] bg-white/[0.025] text-white/60 active:cursor-grabbing"} ${intro ? "ti-fade" : ""}`}
            >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chapterColors[data.color].dot}`} />
                <span className="truncate">{data.title}</span>
                {notes && <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/45 transition-colors group-hover:text-white" />}
            </Body>
        </>
    );
};

// A prerequisite arrow: a bezier curve with its own arrowhead. While the map draws itself in,
// the line draws from its start (pathLength 1 makes the dash pattern a fraction of the line)
// and the arrowhead appears as the line arrives.
const arrowColor = "rgba(255, 255, 255, 0.32)";
export const TrailEdge = ({ source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps<Edge>) => {
    const intro = useContext(TrailIntroTiming);
    const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const delay = intro ? intro.edge(source.split("/")[0], target.split("/")[0]) : 0;
    // The arrowhead points the way the line arrives: down into a topic below, otherwise right
    const angle = targetPosition === Position.Top ? 90 : 0;
    return (
        <>
            <BaseEdge
                path={path}
                pathLength={intro ? 1 : undefined}
                className={intro ? "ti-draw" : undefined}
                style={{ stroke: arrowColor, strokeWidth: 1.25, ...(intro ? { animationDelay: `${delay}s` } : {}) }}
            />
            <path
                d="M -9 -4.5 L 0 0 L -9 4.5 Z"
                transform={`translate(${targetX} ${targetY}) rotate(${angle})`}
                fill={arrowColor}
                className={intro ? "ti-fade" : undefined}
                style={intro ? { animationDelay: `${delay + 0.55}s` } : undefined}
            />
        </>
    );
};
