import { useContext, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { Minus } from "lucide-react";
import type { TrailColor } from "./TrailData";
import { chapterSize, circleSize, panelHeaderHeight } from "./TrailLayout";
import { TrailActions, chapterColors } from "./TrailTheme";

export type ChapterNodeData = {
    title: string;
    color: TrailColor;
    open: boolean;
    topicCount: number;
};

export type TopicNodeData = {
    title: string;
    color: TrailColor;
    direction: "DOWN" | "RIGHT";
    notes?: string;
    leaving?: boolean;
};

// Chapters drag by this class only: the panel header, or the circle when collapsed
export const dragHandleClass = "trail-drag-handle";

// Collapsed, edges meet the circle; open, they meet the panel at its header line
const circleInset = (chapterSize.width - circleSize) / 2;

export const ChapterNode = ({ id, data }: NodeProps<Node<ChapterNodeData>>) => {
    const colors = chapterColors[data.color];
    const { focusChapter, toggleChapter, flyToChapter } = useContext(TrailActions);
    const updateNodeInternals = useUpdateNodeInternals();

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
                className={`absolute inset-0 overflow-hidden rounded-3xl border bg-card/80 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-opacity ${colors.panel} ${data.open ? "opacity-100 delay-100 duration-300" : "pointer-events-none opacity-0 duration-150"}`}
            >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent to-60% ${colors.tint}`} />
                <div
                    className={`${dragHandleClass} relative flex cursor-grab items-center gap-3 border-b border-white/[0.06] px-5 active:cursor-grabbing`}
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
                {data.topicCount === 0 && (
                    <p className="relative px-5 pt-6 text-sm text-white/40">Notes for this chapter are on their way.</p>
                )}
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

export const TopicNode = ({ data }: NodeProps<Node<TopicNodeData>>) => (
    <div
        className={`flex h-full w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white/85 transition-colors hover:border-white/25 hover:bg-white/[0.08] ${data.leaving ? "animate-out fade-out-0 zoom-out-95 fill-mode-forwards duration-150" : "animate-in fade-in-0 zoom-in-95 duration-300"}`}
    >
        {/* Links across chapters run left to right; links inside a chapter follow its own direction */}
        <Handle id="in" type="target" position={Position.Left} className="!invisible" />
        <Handle id="flow-in" type="target" position={data.direction === "DOWN" ? Position.Top : Position.Left} className="!invisible" />
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chapterColors[data.color].dot}`} />
        <span className="truncate">{data.title}</span>
        <Handle id="out" type="source" position={Position.Right} className="!invisible" />
        <Handle id="flow-out" type="source" position={data.direction === "DOWN" ? Position.Bottom : Position.Right} className="!invisible" />
    </div>
);
