import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ReactFlow, useNodesState, useReactFlow } from "@xyflow/react";
import type { Node, XYPosition } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleHelp, RotateCcw } from "lucide-react";

import { BackButton } from "@/components/exit-button";
import { chapters } from "./TrailData";
import { ChapterNode, TopicNode, TrailEdge } from "./NodeTypes";
import type { ChapterNodeData } from "./NodeTypes";
import { TrailActions } from "./TrailTheme";
import { boundsOf, directPrerequisites, framing, layoutTrail, previewFraming, trailEdges, withTerritory } from "./TrailLayout";
import type { Rect } from "./TrailLayout";
import { clearArrangement, introHidden, loadArrangement, saveArrangement } from "./trailStorage";
import { TrailIntroTiming, introTiming } from "./trailIntro";
import Territories from "./Territories";
import TrailIntro from "./TrailIntro";

// The trail map: chapters (React Flow nodes) laid out in journeys, prerequisite arrows, and hex
// territories behind them. One instance lives in the home page's trail panel.
// view "panel": a still picture framed as the home page's preview (previewFraming), drawing
// itself in while `intro` is set. view "full": the interactive map.
// view "moving": the stage controls the camera and interaction is disabled.
// The stage around it moves the camera through the handle (TrailMapHandle) as it grows and shrinks.

const trailNodeTypes = { chapter: ChapterNode, topic: TopicNode };
const trailEdgeTypes = { trail: TrailEdge };
const prerequisites = directPrerequisites(chapters);
const baseEdges = trailEdges(prerequisites, chapters);
const chapterIds = chapters.map((chapter) => chapter.id);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const morphMs = reduceMotion ? 0 : 450;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// Each chapter gets a band of z values, so its own edges sit just above it
const zFor = (order: string[], id: string) => order.indexOf(id) * 3;
const chapterOf = (nodeId: string) => nodeId.split("/")[0];
const sizeOf = (element: HTMLElement) => ({ width: element.clientWidth, height: element.clientHeight });
const colorOf = (id: string) => chapters.find((c) => c.id === id)!.color;

const rectOf = (node: Node): Rect => ({
    x: node.position.x,
    y: node.position.y,
    width: Number(node.style!.width),
    height: Number(node.style!.height),
});

const chapterNode = (id: string, rect: Rect, zIndex: number): Node<ChapterNodeData> => {
    const chapter = chapters.find((c) => c.id === id)!;
    return {
        id,
        type: "chapter",
        position: { x: rect.x, y: rect.y },
        style: { width: rect.width, height: rect.height },
        // Known sizes let React Flow show the node before measuring it
        initialWidth: rect.width,
        initialHeight: rect.height,
        zIndex,
        data: { title: chapter.title, color: chapter.color, topicCount: chapter.topics?.length ?? 0, notes: chapter.notes },
    };
};

// The fresh layout for this canvas shape, with the visitor's saved arrangement on top of it
function initialTrail(aspectRatio: number) {
    const layout = layoutTrail(chapters, prerequisites, aspectRatio);
    const saved = loadArrangement(chapterIds);
    const order = saved && saved.order.length === chapterIds.length ? saved.order : chapterIds;
    const chapterNodes = chapterIds.map((id) => {
        const placement = layout.placements[id];
        const position = saved ? { x: saved.chapters[id].x, y: saved.chapters[id].y } : placement.position;
        return chapterNode(id, { ...position, ...placement.size }, zFor(order, id));
    });
    // Children must follow their parents in the array
    const topicNodes = chapterIds.flatMap((id) => layout.placements[id].topics);
    return { layout, order, nodes: [...chapterNodes, ...topicNodes] };
}

export type TrailMapHandle = {
    showPreview: (duration: number) => Promise<void>; // the home page preview's view
    showWhole: (duration: number) => Promise<void>; // the Trail's own view of the whole map
};

type TrailMapProps = {
    view: "panel" // preview framing follows the panel's size
        | "full" // interactive map with the visitor's camera
        | "moving"; // stage controls the camera while growing or shrinking
    aspectRatio: number; // of the canvas, for the layout
    intro: boolean; // draw in (paused and resumed from outside, by CSS)
    onExit: () => void;
};

// The intro dialog opens the first time the full map is shown on each visit
let introShown = false;

const TrailMap = forwardRef<TrailMapHandle, TrailMapProps>(({ view, aspectRatio, intro, onExit }, ref) => {
    const { fitBounds, setViewport } = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);
    const [start] = useState(() => initialTrail(aspectRatio));
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(start.nodes);
    const [order, setOrder] = useState(start.order); // back to front
    const [introOpen, setIntroOpen] = useState(false);
    const resetting = useRef(false);

    // Callbacks read the latest state through these, so they stay stable
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const orderRef = useRef(order);
    orderRef.current = order;

    const clockRef = useRef<HTMLDivElement>(null);
    const timing = useMemo(
        () =>
            introTiming(
                new Map(start.nodes.filter((node) => node.type === "chapter").map((node) => [node.id, rectOf(node)])),
                () => Number(clockRef.current?.getAnimations()[0]?.currentTime ?? 0) / 1000
            ),
        [start]
    );

    // Saving happens after the render that follows a change, so it sees that change
    const [saveRequest, setSaveRequest] = useState(0);
    const requestSave = useCallback(() => setSaveRequest((n) => n + 1), []);
    useEffect(() => {
        if (saveRequest === 0) return;
        const saved = Object.fromEntries(
            nodesRef.current.filter((node) => node.type === "chapter").map((node) => [node.id, node.position])
        );
        saveArrangement({ chapters: saved, order: orderRef.current });
    }, [saveRequest]);

    const showWhole = useCallback(
        async (duration: number) => {
            const container = containerRef.current;
            if (!container) return;
            setViewport(framing(withTerritory(boundsOf(nodesRef.current.filter((node) => node.type === "chapter").map(rectOf))), sizeOf(container)), { duration });
            await wait(duration);
        },
        [setViewport]
    );
    // A move running late on slow frames is set exactly at the end
    const showPreview = useCallback(
        async (duration: number) => {
            const container = containerRef.current;
            if (!container) return;
            const target = () =>
                previewFraming(
                    nodesRef.current.filter((node) => node.type === "chapter").map((node) => ({ rect: rectOf(node), color: colorOf(node.id) })),
                    sizeOf(container)
                );
            setViewport(target(), { duration });
            if (duration === 0) return;
            await wait(duration + 30);
            setViewport(target());
        },
        [setViewport]
    );
    useImperativeHandle(ref, () => ({ showPreview, showWhole }), [showPreview, showWhole]);

    // The first view. Later moves between the two views are the stage's to make.
    const initialView = useRef(view);
    useEffect(() => {
        void (initialView.current === "panel" ? showPreview(0) : showWhole(0));
    }, [showPreview, showWhole]);

    // In the panel, the view follows the canvas's size; the full map keeps the visitor's camera
    useEffect(() => {
        const container = containerRef.current;
        if (view !== "panel" || !container) return;
        const observer = new ResizeObserver(() => void showPreview(0));
        observer.observe(container);
        return () => observer.disconnect();
    }, [view, showPreview]);

    useEffect(() => {
        if (view === "full" && !introShown && !introHidden()) {
            introShown = true;
            setIntroOpen(true);
        } else if (view !== "full") {
            setIntroOpen(false);
        }
    }, [view]);

    // Moves chapters frame by frame, so their edges follow
    const tween = useCallback(
        (moves: { id: string; from: XYPosition; to: XYPosition }[]) =>
            new Promise<void>((resolve) => {
                const apply = (t: number) =>
                    setNodes((current) =>
                        current.map((node) => {
                            const move = moves.find((m) => m.id === node.id);
                            if (!move) return node;
                            const lerp = (a: number, b: number) => a + (b - a) * t;
                            return {
                                ...node,
                                position: { x: lerp(move.from.x, move.to.x), y: lerp(move.from.y, move.to.y) },
                            };
                        })
                    );
                if (morphMs === 0) {
                    apply(1);
                    resolve();
                    return;
                }
                const begin = performance.now();
                const step = (now: number) => {
                    const t = Math.min(1, (now - begin) / morphMs);
                    apply(easeInOutCubic(t));
                    if (t < 1) requestAnimationFrame(step);
                    else resolve();
                };
                requestAnimationFrame(step);
            }),
        [setNodes]
    );

    const focusChapter = useCallback(
        (id: string) => {
            const current = orderRef.current;
            if (current[current.length - 1] === id) return;
            const next = [...current.filter((other) => other !== id), id];
            setOrder(next);
            setNodes((all) => all.map((node) => (node.type === "chapter" ? { ...node, zIndex: zFor(next, node.id) } : node)));
            requestSave();
        },
        [requestSave, setNodes]
    );

    const flyToChapter = useCallback(
        (id: string) => {
            const node = nodesRef.current.find((n) => n.id === id);
            if (node) fitBounds(rectOf(node), { padding: 0.18, duration: morphMs });
        },
        [fitBounds]
    );

    // Back to the fresh layout, in its original place and order
    const resetTrail = useCallback(async () => {
        if (resetting.current) return;
        resetting.current = true;
        clearArrangement();
        const { placements, bounds } = start.layout;

        const moves = nodesRef.current
            .filter((node) => node.type === "chapter")
            .map((node) => ({ id: node.id, from: node.position, to: placements[node.id].position }));
        setOrder(chapterIds);
        setNodes((all) => all.map((node) => node.type === "chapter" ? { ...node, zIndex: zFor(chapterIds, node.id) } : node));
        const container = containerRef.current;
        if (container) setViewport(framing(withTerritory(bounds), sizeOf(container)), { duration: morphMs });
        await tween(moves);

        resetting.current = false;
    }, [setNodes, setViewport, tween, start]);

    // Edges sit just above the higher of their two chapters
    const edges = useMemo(
        () => baseEdges.map((edge) => ({
            ...edge,
            type: "trail",
            zIndex: Math.max(zFor(order, chapterOf(edge.source)), zFor(order, chapterOf(edge.target))) + 1,
            className: edge.data?.soft ? "trail-soft-edge" : undefined,
        })),
        [order]
    );

    const territory = useMemo(
        () =>
            nodes
                .filter((node) => node.type === "chapter")
                .map((node) => ({ id: node.id, rect: rectOf(node), color: (node.data as ChapterNodeData).color, z: zFor(order, node.id) })),
        [nodes, order]
    );

    // Drags that start on a topic move its chapter by hand (topics themselves never move)
    const moveChapterBy = useCallback(
        (id: string, dx: number, dy: number) =>
            setNodes((all) => all.map((n) => (n.id === id ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n))),
        [setNodes]
    );

    const actions = useMemo(
        () => ({ focusChapter, flyToChapter, moveChapterBy, saveArrangement: requestSave }),
        [focusChapter, flyToChapter, moveChapterBy, requestSave]
    );
    const live = view === "full";

    return (
        <TrailActions.Provider value={actions}>
            <TrailIntroTiming.Provider value={intro ? timing : null}>
                <div ref={containerRef} className="relative h-full w-full">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={trailNodeTypes}
                        edgeTypes={trailEdgeTypes}
                        onNodesChange={onNodesChange}
                        onNodeDragStop={requestSave}
                        nodeDragThreshold={0}
                        nodesDraggable={live}
                        panOnDrag={live}
                        zoomOnScroll={live}
                        zoomOnPinch={live}
                        zoomOnDoubleClick={live}
                        preventScrolling={live}
                        // React Flow's keys listen on the whole document and swallow the key, so
                        // the map in the panel would take them from the home page
                        {...(live ? {} : { panActivationKeyCode: null, deleteKeyCode: null, selectionKeyCode: null, multiSelectionKeyCode: null, zoomActivationKeyCode: null })}
                        minZoom={0.2}
                        maxZoom={2}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Territories chapters={territory} />
                    </ReactFlow>

                    {live && (
                        <>
                            <BackButton onClick={onExit} className="absolute left-3 top-3" />
                            <div className="absolute right-3 top-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIntroOpen(true)}
                                    aria-label="About this map"
                                    title="About this map"
                                    className="flex items-center rounded-full border border-border bg-background/70 p-2 text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white"
                                >
                                    <CircleHelp className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={resetTrail}
                                    aria-label="Reset layout"
                                    title="Reset layout"
                                    className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 py-2 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Reset layout</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Runs exactly as long as the intro; the stage watches it to know when it's over */}
                    {intro && <div ref={clockRef} className="ti-clock" style={{ animationDuration: `${timing.end}s` }} aria-hidden="true" />}

                    <TrailIntro open={introOpen} onOpenChange={setIntroOpen} />
                </div>
            </TrailIntroTiming.Provider>
        </TrailActions.Provider>
    );
});
TrailMap.displayName = "TrailMap";

export default TrailMap;
