import { Fragment, useContext, useId } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BaseEdge, Handle, Position, getBezierPath, useInternalNode, useReactFlow } from "@xyflow/react";
import type { Edge, EdgeProps, InternalNode, Node, NodeProps } from "@xyflow/react";
import { ArrowUpRight } from "lucide-react";
import { isPhone } from "@/lib/layout";
import type { TrailColor } from "./TrailData";
import type { SectionBand } from "./TrailLayout";
import { TrailActions, chapterColors } from "./TrailTheme";
import { TrailIntroTiming } from "./trailIntro";
import { notebooks, notesPath } from "../Notes/notesIndex";

export type ChapterNodeData = {
    title: string;
    color: TrailColor;
    topicCount: number;
    notes?: string;
    titleWidth: number;
    sections: SectionBand[];
};

export type TopicNodeData = {
    title: string;
    color: TrailColor;
    direction: "DOWN" | "RIGHT";
    index: number; // in its chapter's list
    notes?: string;
    hint?: string;
};

// Notes open in a new tab, so the visitor's arrangement of the trail stays as it was.
// A slug with no notebook behind it (yet) shows nothing.
const notesLink = (slug?: string) => (slug && notebooks[slug] ? { href: notesPath(slug), target: "_blank", rel: "noopener" } : null);

// A chapter is a frosted sheet: whatever it's dragged over shows blurred through it.
// Edges meet the middle of its sides, or of a section's band. The title sits in a bar down the
// left, one word to a line.
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
            {data.sections.map((section) => (
                <Fragment key={section.id}>
                    <Handle id={`in-${section.id}`} type="target" position={Position.Left} className="!invisible" style={{ top: section.top + section.height / 2 }} />
                    <Handle id={`out-${section.id}`} type="source" position={Position.Right} className="!invisible" style={{ top: section.top + section.height / 2 }} />
                </Fragment>
            ))}

            <div
                className={`absolute inset-0 cursor-grab overflow-hidden rounded-3xl border bg-card/80 active:cursor-grabbing shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md ${colors.panel} ${intro ? "ti-rise" : ""}`}
                style={intro ? { animationDelay: `${intro.chapter(id)}s` } : undefined}
            >
                <div
                    className={`absolute inset-y-0 left-0 flex items-center justify-center border-r text-center ${colors.title}`}
                    style={{ width: data.titleWidth }}
                >
                    {/* As narrow as its longest word, so every space breaks the line */}
                    <button
                        type="button"
                        onClick={() => flyToChapter(id)}
                        title="Zoom to this chapter"
                        className="w-min text-base font-semibold leading-snug text-white decoration-white/30 underline-offset-4 hover:underline"
                    >
                        {data.title}
                    </button>
                </div>
                {data.sections.slice(1).map((section) => (
                    <div
                        key={section.id}
                        className="absolute right-0 border-t border-white/[0.06]"
                        style={{ top: section.top, left: data.titleWidth }}
                    />
                ))}
                {data.topicCount === 0 && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-5" style={{ left: data.titleWidth }}>
                        {notes ? (
                            <a
                                {...notes}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 transition-colors hover:border-white/35 hover:text-white"
                            >
                                Read the notes
                                <ArrowUpRight className="h-4 w-4" />
                            </a>
                        ) : (
                            <p className="text-sm text-white/40">Notes for this chapter are on their way.</p>
                        )}
                    </div>
                )}
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
    // by the zoom, so the panel stays under the cursor at any zoom level. On phones nothing drags
    // (there's no room to), so a topic passes touches through and swiping on it pans the map.
    const draggable = !isPhone();
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
            {/* Links between a chapter's sections run up or down */}
            <Handle id="up-out" type="source" position={Position.Top} className="!invisible" />
            <Handle id="up-in" type="target" position={Position.Bottom} className="!invisible" />
            <Handle id="down-out" type="source" position={Position.Bottom} className="!invisible" />
            <Handle id="down-in" type="target" position={Position.Top} className="!invisible" />
            <Body
                {...notes}
                title={data.hint}
                onPointerDown={draggable ? startDrag : undefined}
                draggable={false}
                style={intro && parentId ? { animationDelay: `${intro.topic(parentId, data.index)}s` } : undefined}
                className={`flex h-full w-full select-none items-center gap-2.5 rounded-xl border px-3.5 text-sm transition-colors ${draggable ? "nopan touch-none" : ""} ${notes ? "group cursor-pointer border-white/15 bg-white/[0.06] text-white/90 hover:border-white/40 hover:bg-white/[0.12] hover:text-white" : `border-white/[0.07] bg-white/[0.025] text-white/60 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`} ${intro ? "ti-fade" : ""}`}
            >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${chapterColors[data.color].dot}`} />
                <span className="truncate">{data.title}</span>
                {notes && <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/45 transition-colors group-hover:text-white" />}
            </Body>
        </>
    );
};

// One end of an arrow between chapters
type End = { x: number; y: number; position: Position };

// Where an arrow between two chapters starts and ends, from where its two nodes (a chapter, a
// section's band of one, or a topic) are now. It leaves sideways towards its target; going right,
// it enters the target's left side, and going left it drops into the target's top, or rises into
// its bottom when the target is higher.
function crossChapterEnds(source: InternalNode, sourceHandle: string, target: InternalNode, targetHandle: string): [End, End] {
    const rect = (node: InternalNode, handle: string) => {
        const { x, y } = node.internals.positionAbsolute;
        const width = node.measured.width ?? node.initialWidth ?? 0;
        const height = node.measured.height ?? node.initialHeight ?? 0;
        const band = (node.data as Partial<ChapterNodeData>).sections?.find((s) => handle.endsWith(`-${s.id}`));
        return { x, y, width, height, middle: band ? y + band.top + band.height / 2 : y + height / 2 };
    };
    const s = rect(source, sourceHandle);
    const t = rect(target, targetHandle);
    if (t.x + t.width / 2 >= s.x + s.width / 2) {
        return [{ x: s.x + s.width, y: s.middle, position: Position.Right }, { x: t.x, y: t.middle, position: Position.Left }];
    }
    const start = { x: s.x, y: s.middle, position: Position.Left };
    return t.y > s.middle
        ? [start, { x: t.x + t.width / 2, y: t.y, position: Position.Top }]
        : [start, { x: t.x + t.width / 2, y: t.y + t.height, position: Position.Bottom }];
}

// A prerequisite arrow: a bezier curve with its own arrowhead. While the map draws itself in,
// the line draws from its start (pathLength 1 makes the dash pattern a fraction of the line)
// and the arrowhead appears as the line arrives. A dotted line has a dash pattern of its own,
// so a solid line drawing in the same way reveals it through a mask.
const arrowColor = "rgba(255, 255, 255, 0.32)";
// Arrows inside a chapter keep to their handles; arrows between chapters find their own ends.
export const TrailEdge = (props: EdgeProps<Edge>) => {
    const { source, target, sourceHandleId, targetHandleId, data } = props;
    const intro = useContext(TrailIntroTiming);
    const maskId = `trail-draw-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const [from, to]: [End, End] =
        source.split("/")[0] !== target.split("/")[0] && sourceNode && targetNode
            ? crossChapterEnds(sourceNode, sourceHandleId ?? "", targetNode, targetHandleId ?? "")
            : [
                  { x: props.sourceX, y: props.sourceY, position: props.sourcePosition },
                  { x: props.targetX, y: props.targetY, position: props.targetPosition },
              ];
    const [path] = getBezierPath({
        sourceX: from.x,
        sourceY: from.y,
        sourcePosition: from.position,
        targetX: to.x,
        targetY: to.y,
        targetPosition: to.position,
    });
    const [targetX, targetY, targetPosition] = [to.x, to.y, to.position];
    const delay = intro ? intro.edge(source.split("/")[0], target.split("/")[0]) : 0;
    const drawing = intro ? { pathLength: 1, className: "ti-draw", style: { animationDelay: `${delay}s` } } : null;
    const masked = drawing && data?.soft;
    // The arrowhead points the way the line arrives: down into a topic below, up into one above, otherwise right
    const angle = targetPosition === Position.Top ? 90 : targetPosition === Position.Bottom ? -90 : 0;
    return (
        <>
            {masked && (
                <mask id={maskId} maskUnits="userSpaceOnUse" x={-1e5} y={-1e5} width={2e5} height={2e5}>
                    <path d={path} fill="none" stroke="white" strokeWidth={4} {...drawing} />
                </mask>
            )}
            <BaseEdge
                path={path}
                pathLength={masked ? undefined : drawing?.pathLength}
                className={masked ? undefined : drawing?.className}
                mask={masked ? `url(#${maskId})` : undefined}
                style={{ stroke: arrowColor, strokeWidth: 1.25, ...(masked ? {} : drawing?.style) }}
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
