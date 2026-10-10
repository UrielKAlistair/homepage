import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, BackgroundVariant, MarkerType, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleHelp, RotateCcw } from "lucide-react";

import Navbar from "@/components/navbar";
import { chapters, domains } from "./TrailData";
import { ChapterNode, TopicNode, dragHandleClass } from "./NodeTypes";
import type { ChapterNodeData } from "./NodeTypes";
import { TrailActions, chapterColors } from "./TrailTheme";
import { chapterSize, collapsedRect, directPrerequisites, layoutTrail, visibleEdges } from "./TrailLayout";
import type { ChapterPlacement, Rect } from "./TrailLayout";
import { clearArrangement, introHidden, loadArrangement, saveArrangement } from "./trailStorage";
import Territories from "./Territories";
import TrailIntro from "./TrailIntro";
import type { TerritoryChapter } from "./Territories";

const trailNodeTypes = { chapter: ChapterNode, topic: TopicNode };
const prerequisites = directPrerequisites(chapters);
const chapterIds = chapters.map((chapter) => chapter.id);

// ?territories=fixed keeps territories where the fresh layout put them instead of following drags
const territoryMode = new URLSearchParams(window.location.search).get("territories") === "fixed" ? "fixed" : "live";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const morphMs = reduceMotion ? 0 : 450;
const topicFadeMs = reduceMotion ? 0 : 150;

const edgeColor = "rgba(255, 255, 255, 0.32)";
const defaultEdgeOptions = {
    style: { stroke: edgeColor, strokeWidth: 1.25 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 14, height: 14 },
};

// Below this zoom the labels get too small to read, so small screens pan instead of shrinking further
const minReadableZoom = 0.6;
const viewPadding = 24;
const resetButtonClearance = 60; // top padding when starting from the top-left, so the Reset button covers nothing

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// Each chapter gets a band of z values, so its own edges sit just above it
const zFor = (order: string[], id: string) => order.indexOf(id) * 3;
const chapterOf = (nodeId: string) => nodeId.split("/")[0];

const rectOf = (node: Node): Rect => ({
    x: node.position.x,
    y: node.position.y,
    width: Number(node.style?.width ?? chapterSize.width),
    height: Number(node.style?.height ?? chapterSize.height),
});

const boundsOf = (rects: Rect[]): Rect => {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return {
        x,
        y,
        width: Math.max(...rects.map((r) => r.x + r.width)) - x,
        height: Math.max(...rects.map((r) => r.y + r.height)) - y,
    };
};

const chapterNode = (id: string, rect: Rect, open: boolean, zIndex: number): Node<ChapterNodeData> => {
    const chapter = chapters.find((c) => c.id === id)!;
    return {
        id,
        type: "chapter",
        position: { x: rect.x, y: rect.y },
        style: { width: rect.width, height: rect.height },
        zIndex,
        dragHandle: `.${dragHandleClass}`,
        data: { title: chapter.title, color: chapter.color, open, topicCount: chapter.topics?.length ?? 0 },
    };
};

const TrailCanvas = () => {
    const { fitBounds, setViewport } = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
    const [order, setOrder] = useState<string[]>(chapterIds); // back to front
    const [introOpen, setIntroOpen] = useState(() => !introHidden());

    const [freshTerritory, setFreshTerritory] = useState<TerritoryChapter[]>([]);
    const placements = useRef<Record<string, ChapterPlacement>>({});
    const freshBounds = useRef<Rect | null>(null);
    const animating = useRef(new Set<string>());

    // Callbacks read the latest state through these, so they stay stable
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const openRef = useRef(openChapters);
    openRef.current = openChapters;
    const orderRef = useRef(order);
    orderRef.current = order;

    // Saving happens after the render that follows a change, so it sees that change
    const [saveRequest, setSaveRequest] = useState(0);
    const requestSave = useCallback(() => setSaveRequest((n) => n + 1), []);
    useEffect(() => {
        if (saveRequest === 0) return;
        const saved = Object.fromEntries(
            nodesRef.current
                .filter((node) => node.type === "chapter")
                .map((node) => [node.id, { ...node.position, open: openRef.current.has(node.id) }])
        );
        saveArrangement({ chapters: saved, order: orderRef.current });
    }, [saveRequest]);

    // Fits the given area, or on small screens starts at a readable zoom from its top-left
    const showArea = useCallback(
        (area: Rect, duration = 0) => {
            const container = containerRef.current;
            if (!container) return;
            const fitZoom = Math.min(
                (container.clientWidth - viewPadding * 2) / area.width,
                (container.clientHeight - viewPadding * 2) / area.height
            );
            if (fitZoom >= minReadableZoom) {
                fitBounds(area, { padding: 0.08, duration });
                return;
            }
            const zoom = minReadableZoom;
            const fitsVertically = area.height * zoom <= container.clientHeight - viewPadding * 2;
            setViewport(
                {
                    x: viewPadding - area.x * zoom,
                    y: fitsVertically ? (container.clientHeight - area.height * zoom) / 2 - area.y * zoom : resetButtonClearance - area.y * zoom,
                    zoom,
                },
                { duration }
            );
        },
        [fitBounds, setViewport]
    );

    // First load: the fresh layout with everything open, or the visitor's saved arrangement
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        layoutTrail(chapters, prerequisites, container.clientWidth / container.clientHeight).then((layout) => {
            placements.current = layout.placements;
            freshBounds.current = layout.bounds;

            const saved = loadArrangement(chapterIds);
            const initialOrder = saved && saved.order.length === chapterIds.length ? saved.order : chapterIds;
            const open = new Set(chapterIds.filter((id) => (saved ? saved.chapters[id].open : true)));

            const chapterNodes = chapterIds.map((id) => {
                const placement = layout.placements[id];
                const isOpen = open.has(id);
                const position = saved ? { x: saved.chapters[id].x, y: saved.chapters[id].y } : placement.position;
                const size = isOpen ? placement.openSize : chapterSize;
                return chapterNode(id, { ...position, ...size }, isOpen, zFor(initialOrder, id));
            });
            // Children must follow their parents in the array
            const topicNodes = chapterIds.filter((id) => open.has(id)).flatMap((id) => layout.placements[id].topics);

            setFreshTerritory(
                chapterIds.map((id) => ({
                    id,
                    rect: { ...layout.placements[id].position, ...layout.placements[id].openSize },
                    color: chapters.find((c) => c.id === id)!.color,
                    z: 0,
                }))
            );
            setOrder(initialOrder);
            setOpenChapters(open);
            setNodes([...chapterNodes, ...topicNodes]);
            requestAnimationFrame(() => showArea(boundsOf(chapterNodes.map(rectOf))));
        });
    }, [setNodes, showArea]);

    // Moves and resizes chapters frame by frame, so their edges follow
    const tween = useCallback(
        (moves: { id: string; from: Rect; to: Rect }[]) =>
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
                                style: { ...node.style, width: lerp(move.from.width, move.to.width), height: lerp(move.from.height, move.to.height) },
                            };
                        })
                    );
                if (morphMs === 0) {
                    apply(1);
                    resolve();
                    return;
                }
                const start = performance.now();
                const step = (now: number) => {
                    const t = Math.min(1, (now - start) / morphMs);
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

    // Collapse or reopen in place, anchored at the top centre. Nothing else moves; overlap is allowed.
    const toggleChapter = useCallback(
        async (id: string) => {
            const node = nodesRef.current.find((n) => n.id === id);
            if (!node || animating.current.has(id)) return;
            animating.current.add(id);
            const rect = rectOf(node);

            if (openRef.current.has(id)) {
                setNodes((all) => all.map((n) => (n.parentId === id ? { ...n, data: { ...n.data, leaving: true } } : n)));
                await wait(topicFadeMs);
                setNodes((all) => all.filter((n) => n.parentId !== id).map((n) => (n.id === id ? { ...n, data: { ...n.data, open: false } } : n)));
                setOpenChapters((open) => new Set([...open].filter((other) => other !== id)));
                await tween([{ id, from: rect, to: collapsedRect(rect) }]);
            } else {
                const { openSize, topics } = placements.current[id];
                const to = { x: rect.x + rect.width / 2 - openSize.width / 2, y: rect.y, ...openSize };
                setNodes((all) => all.map((n) => (n.id === id ? { ...n, data: { ...n.data, open: true } } : n)));
                await tween([{ id, from: rect, to }]);
                setNodes((all) => [...all, ...topics]);
                setOpenChapters((open) => new Set([...open, id]));
            }

            animating.current.delete(id);
            requestSave();
        },
        [requestSave, setNodes, tween]
    );

    const flyToChapter = useCallback(
        (id: string) => {
            const node = nodesRef.current.find((n) => n.id === id);
            if (node) fitBounds(rectOf(node), { padding: 0.18, duration: morphMs });
        },
        [fitBounds]
    );

    // Back to the fresh layout: everything open, in its original place and order
    const resetTrail = useCallback(async () => {
        if (animating.current.size > 0 || !freshBounds.current) return;
        chapterIds.forEach((id) => animating.current.add(id));
        clearArrangement();

        const moves = nodesRef.current
            .filter((node) => node.type === "chapter")
            .map((node) => {
                const { position, openSize } = placements.current[node.id];
                return { id: node.id, from: rectOf(node), to: { ...position, ...openSize } };
            });
        setOrder(chapterIds);
        setNodes((all) =>
            all
                .filter((node) => node.type === "chapter")
                .map((node) => ({ ...node, zIndex: zFor(chapterIds, node.id), data: { ...node.data, open: true } }))
        );
        setOpenChapters(new Set());
        showArea(freshBounds.current, morphMs);
        await tween(moves);

        setNodes((all) => [...all, ...chapterIds.flatMap((id) => placements.current[id].topics)]);
        setOpenChapters(new Set(chapterIds));
        animating.current.clear();
    }, [setNodes, showArea, tween]);

    // Edges follow which chapters are open, and sit just above the higher of their two chapters
    const edges = useMemo(
        () =>
            visibleEdges(prerequisites, openChapters, chapters).map((edge) => ({
                ...edge,
                zIndex: Math.max(zFor(order, chapterOf(edge.source)), zFor(order, chapterOf(edge.target))) + 1,
                className: edge.source.includes("/") || edge.target.includes("/") ? "trail-topic-edge" : undefined,
            })),
        [openChapters, order]
    );

    const liveTerritory = useMemo(
        () =>
            nodes
                .filter((node) => node.type === "chapter")
                .map((node) => ({ id: node.id, rect: rectOf(node), color: (node.data as ChapterNodeData).color, z: zFor(order, node.id) })),
        [nodes, order]
    );

    const actions = useMemo(() => ({ focusChapter, toggleChapter, flyToChapter }), [focusChapter, toggleChapter, flyToChapter]);

    return (
        <TrailActions.Provider value={actions}>
            <div ref={containerRef} className="relative h-full w-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={trailNodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    onNodesChange={onNodesChange}
                    onNodeDragStop={requestSave}
                    minZoom={0.2}
                    maxZoom={2}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Lines} gap={40} size={1} color="rgba(255,255,255,0.04)" />
                    <Territories chapters={territoryMode === "fixed" ? freshTerritory : liveTerritory} />
                </ReactFlow>

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

                <TrailIntro open={introOpen} onOpenChange={setIntroOpen} />

                <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-border bg-background/70 px-4 py-2 text-xs text-white/60 backdrop-blur-sm">
                    {domains.map((domain) => (
                        <span key={domain.color} className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${chapterColors[domain.color].dot}`} />
                            {domain.label}
                        </span>
                    ))}
                </div>
            </div>
        </TrailActions.Provider>
    );
};

const Trail = () => (
    <div className="min-h-screen">
        <Navbar />
        <main className="h-[calc(100dvh-72px)] p-3 md:p-6">
            <div className="h-full overflow-hidden rounded-3xl border border-border bg-muted/70">
                <ReactFlowProvider>
                    <TrailCanvas />
                </ReactFlowProvider>
            </div>
        </main>
    </div>
);

export default Trail;
