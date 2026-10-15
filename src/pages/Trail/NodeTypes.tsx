import { useContext, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { ArrowUpRight, Minus } from "lucide-react";
import type { TrailColor } from "./TrailData";
import { chapterSize, circleSize, panelHeaderHeight } from "./TrailLayout";
import { TrailActions, chapterColors } from "./TrailTheme";
import { notebooks, notesPath } from "../Notes/notesIndex";

export type ChapterNodeData = {
    title: string;
    color: TrailColor;
    open: boolean;
    topicCount: number;
    notes?: string;
};

export type TopicNodeData = {
    title: string;
    color: TrailColor;
    direction: "DOWN" | "RIGHT";
    notes?: string;
    leaving?: boolean;
};

// Notes open in a new tab, so the visitor's arrangement of the trail stays as it was.
// A slug with no notebook behind it (yet) shows nothing.
const notesLink = (slug?: string) => (slug && notebooks[slug] ? { href: notesPath(slug), target: "_blank", rel: "noopener" } : null);

// Chapters drag by this class only: anywhere on the open panel, or the circle when collapsed
export const dragHandleClass = "trail-drag-handle";

// Collapsed, edges meet the circle; open, they meet the panel at its header line
const circleInset = (chapterSize.width - circleSize) / 2;

export const ChapterNode = ({ id, data }: NodeProps<Node<ChapterNodeData>>) => {
    const colors = chapterColors[data.color];
    const { focusChapter, toggleChapter, flyToChapter } = useContext(TrailActions);
    const updateNodeInternals = useUpdateNodeInternals();
    const notes = notesLink(data.notes);

    // Handles move when the node opens or closes, so React Flow has to re-measure them
    useEffect(() => {
        updateNodeInternals(id);
    }, [id, data.open, updateNodeInternals]);

    const handleTop = data.open ? panelHeaderHeight / 2 : circleSize / 2;
    const handleInset = data.open ? 0 : circleInset;

    return (
        <div className="relative h-full w-full" onPointerDownCapture={() => focusChapter(id)}>
            <Handle id="in" type="target" position={Position.Left} className="!invisible" style={{ top: handleTop, left: handleInset }} />
            <Handle id="out" type="source" position={Position.Right} className="!invisible" style={{ top: handleTop, right: handleInset }} />

            {/* Open: a frosted sheet; whatever it's dragged over shows blurred through it */}
            <div
                className={`${dragHandleClass} absolute inset-0 cursor-grab overflow-hidden rounded-3xl border bg-card/80 active:cursor-grabbing shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-opacity ${colors.panel} ${data.open ? "opacity-100 delay-100 duration-300" : "pointer-events-none opacity-0 duration-150"}`}
            >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent to-60% ${colors.tint}`} />
                <div
                    className="relative flex items-center gap-3 border-b border-white/[0.06] px-5"
                    style={{ height: panelHeaderHeight }}
                >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                    <button
                        type="button"
                        onClick={() => flyToChapter(id)}
                        tabIndex={data.open ? 0 : -1}
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
                    <button
                        type="button"
                        onClick={() => toggleChapter(id)}
                        aria-label={`Collapse ${data.title}`}
                        tabIndex={data.open ? 0 : -1}
                        className="nodrag ml-auto shrink-0 rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                </div>
                {data.topicCount === 0 &&
                    (notes ? (
                        <a
                            {...notes}
                            tabIndex={data.open ? 0 : -1}
                            className="relative mx-5 mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 transition-colors hover:border-white/35 hover:text-white"
                        >
                            Read the notes
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    ) : (
                        <p className="relative px-5 pt-6 text-sm text-white/40">Notes for this chapter are on their way.</p>
                    ))}
            </div>

            {/* Collapsed: circle and label at the top centre, where the panel's header was.
                The fades are staggered with the panel's so the two never overlap for long. */}
            <div
                className={`group absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center transition-opacity ${data.open ? "pointer-events-none opacity-0 duration-100" : "opacity-100 delay-200 duration-200"}`}
                style={{ width: chapterSize.width }}
            >
                <button
                    type="button"
                    onClick={() => toggleChapter(id)}
                    aria-label={`Open ${data.title}`}
                    tabIndex={data.open ? -1 : 0}
                    className={`${dragHandleClass} cursor-pointer rounded-full border-2 transition-transform duration-200 group-hover:scale-110 ${colors.circle}`}
                    style={{ width: circleSize, height: circleSize }}
                />
                <p className="mt-3 px-1 text-center text-sm font-medium leading-snug text-white/80 transition-colors group-hover:text-white">
                    {data.title}
                </p>
            </div>
        </div>
    );
};

// Below this many screen pixels a press is a click, not a drag
const dragThreshold = 4;

export const TopicNode = ({ data, parentId }: NodeProps<Node<TopicNodeData>>) => {
    const notes = notesLink(data.notes);
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

    // Topics with notes are links; the rest are plain labels for now
    const Body = notes ? "a" : "div";
    return (
        <Body
            {...notes}
            title={notes ? `Read the notes on ${data.title}` : undefined}
            onPointerDown={startDrag}
            draggable={false}
            className={`nopan flex h-full w-full touch-none select-none items-center gap-2.5 rounded-xl border px-3.5 text-sm transition-colors ${notes ? "group cursor-pointer border-white/15 bg-white/[0.06] text-white/90 hover:border-white/40 hover:bg-white/[0.12] hover:text-white" : "cursor-grab border-white/[0.07] bg-white/[0.025] text-white/60 active:cursor-grabbing"} ${data.leaving ? "animate-out fade-out-0 zoom-out-95 fill-mode-forwards duration-150" : "animate-in fade-in-0 zoom-in-95 duration-300"}`}
        >
            {/* Links across chapters run left to right; links inside a chapter follow its own direction */}
            <Handle id="in" type="target" position={Position.Left} className="!invisible" />
            <Handle id="flow-in" type="target" position={data.direction === "DOWN" ? Position.Top : Position.Left} className="!invisible" />
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chapterColors[data.color].dot}`} />
            <span className="truncate">{data.title}</span>
            {notes && <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/45 transition-colors group-hover:text-white" />}
            <Handle id="out" type="source" position={Position.Right} className="!invisible" />
            <Handle id="flow-out" type="source" position={data.direction === "DOWN" ? Position.Bottom : Position.Right} className="!invisible" />
        </Body>
    );
};
