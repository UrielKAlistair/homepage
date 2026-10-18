import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { ChapterDoc, TrailColor } from "./TrailData";
import type { TopicNodeData } from "./NodeTypes";

// Box sizes the layout reserves; NodeTypes renders into exactly these
export const chapterSize = { width: 160, height: 112 };
export const circleSize = 56;
const topicSize = { width: 168, height: 44 };
export const panelHeaderHeight = 64;
const panelPadding = 28;
const emptyPanelSize = { width: 300, height: 150 };

// Territory geometry, shared by the territory layer and the camera
export const territoryCellRadius = 22; // circumradius of a flat-topped hex cell, in flow units
export const territoryReach = 52; // how far a territory extends beyond its chapter's edge

export type Size = { width: number; height: number };
export type Rect = XYPosition & Size;

export const boundsOf = (rects: Rect[]): Rect => {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return {
        x,
        y,
        width: Math.max(...rects.map((r) => r.x + r.width)) - x,
        height: Math.max(...rects.map((r) => r.y + r.height)) - y,
    };
};

// Fired once the first layout is on screen (the home page's transition waits for it)
export const trailReadyEvent = "trail-ready";

// The whole territory around an area, with room for the field labels above it
const territoryMargin = territoryReach + territoryCellRadius * 2;
export const withTerritory = (area: Rect): Rect => ({
    x: area.x - territoryMargin,
    y: area.y - territoryMargin,
    width: area.width + territoryMargin * 2,
    height: area.height + territoryMargin * 2,
});

// Below this zoom the labels get too small to read, so the view pans instead of shrinking further.
// Phones need a little more, since their text is already small.
const minReadableZoom = () => (window.innerWidth >= 768 ? 0.5 : 0.6);
const viewPadding = 24;
const fitPadding = 0.08; // as a share of the area, the way React Flow's fitBounds pads
const resetButtonClearance = 60; // top padding when starting from the top-left, so the Reset button covers nothing

export type Viewport = { x: number; y: number; zoom: number };

// How the Trail page shows an area on a canvas of this size: all of it, if it can be read that
// small; otherwise at the smallest readable zoom, starting from its left edge. The home page's
// preview shows exactly this view, so entering and leaving the Trail is one continuous zoom.
export function framing(area: Rect, canvas: Size): Viewport {
    const fitZoom = Math.min((canvas.width - viewPadding * 2) / area.width, (canvas.height - viewPadding * 2) / area.height);
    if (fitZoom >= minReadableZoom()) {
        const zoom = Math.min(canvas.width / (area.width * (1 + fitPadding)), canvas.height / (area.height * (1 + fitPadding)));
        return { x: canvas.width / 2 - (area.x + area.width / 2) * zoom, y: canvas.height / 2 - (area.y + area.height / 2) * zoom, zoom };
    }
    const zoom = minReadableZoom();
    const fitsVertically = area.height * zoom <= canvas.height - viewPadding * 2;
    return {
        x: viewPadding - area.x * zoom,
        y: fitsVertically ? (canvas.height - area.height * zoom) / 2 - area.y * zoom : resetButtonClearance - area.y * zoom,
        zoom,
    };
}

// The home page's preview: the map from its top-left corner down to the territory of the lowest
// chapter above the Physics row; Physics is left for the Trail itself to reveal. Entering the Trail starts on this
// view and zooms out to `framing`.
const previewHorizonColor: TrailColor = "blue";
export function previewFraming(chapters: { rect: Rect; color: TrailColor }[], canvas: Size): Viewport {
    const area = withTerritory(boundsOf(chapters.map((c) => c.rect)));
    const physicsTop = Math.min(...chapters.filter((c) => c.color === previewHorizonColor).map((c) => c.rect.y));
    const above = chapters.filter((c) => c.rect.y + c.rect.height < physicsTop).map((c) => c.rect.y + c.rect.height + territoryReach);
    const horizon = above.length ? Math.max(...above) : area.y + area.height;
    // Physics dragged up near the top would leave a sliver: show the whole map then
    const height = horizon - area.y > area.height * 0.3 ? horizon - area.y : area.height;
    const zoom = canvas.height / height;
    const spare = Math.max(0, canvas.width / zoom - area.width); // a view wider than the map is centred on it
    return { x: -(area.x - spare / 2) * zoom, y: -area.y * zoom, zoom };
}

// The part of the map a viewport shows, in flow coordinates
export const visibleArea = (view: Viewport, canvas: Size): Rect => ({
    x: -view.x / view.zoom,
    y: -view.y / view.zoom,
    width: canvas.width / view.zoom,
    height: canvas.height / view.zoom,
});

const elk = new ELK();

export const topicNodeId = (chapterId: string, topicId: string) => `${chapterId}/${topicId}`;

// ---------------------------------------------------------------------------------------------
// Prerequisites

// One end of a prerequisite: a whole chapter, or one topic in it
export type Endpoint = { chapter: string; topic?: string };
export type Prerequisite = { from: Endpoint; to: Endpoint; soft?: boolean };

// Collects every declared prerequisite and keeps only the direct ones: an edge is dropped when
// a longer strict path already implies it. Each chapter is modelled as an entry point (its own
// requirements) and an exit point (what depends on it) with its topics in between, so chapter-
// and topic-level prerequisites mix: requiring a chapter implies requiring all of its topics.
// Soft prerequisites never make a strict one redundant, but are dropped when a strict path covers them.
export function directPrerequisites(chapters: ChapterDoc[]): Prerequisite[] {
    const declared: Prerequisite[] = [];
    const parse = (ref: string, ownChapter?: string): Endpoint => {
        const [first, second] = ref.split("/");
        if (second !== undefined) return { chapter: first, topic: second };
        if (ownChapter && chapters.find((c) => c.id === ownChapter)?.topics?.some((t) => t.id === first)) {
            return { chapter: ownChapter, topic: first };
        }
        return { chapter: first };
    };
    for (const chapter of chapters) {
        for (const ref of chapter.requires ?? []) declared.push({ from: parse(ref), to: { chapter: chapter.id } });
        for (const ref of chapter.softRequires ?? []) declared.push({ from: parse(ref), to: { chapter: chapter.id }, soft: true });
        for (const topic of chapter.topics ?? []) {
            const to = { chapter: chapter.id, topic: topic.id };
            for (const ref of topic.requires ?? []) declared.push({ from: parse(ref, chapter.id), to });
            for (const ref of topic.softRequires ?? []) declared.push({ from: parse(ref, chapter.id), to, soft: true });
        }
    }
    const strict = declared.filter((p) => !p.soft);
    const soft = declared.filter((p) => p.soft);

    // Graph nodes: "c:in", "c:out" per chapter and "c/t" per topic
    const outKey = (e: Endpoint) => (e.topic ? topicNodeId(e.chapter, e.topic) : `${e.chapter}:out`);
    const inKey = (e: Endpoint) => (e.topic ? topicNodeId(e.chapter, e.topic) : `${e.chapter}:in`);
    const adjacency = new Map<string, string[]>();
    const link = (a: string, b: string) => adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    for (const chapter of chapters) {
        link(`${chapter.id}:in`, `${chapter.id}:out`);
        for (const topic of chapter.topics ?? []) {
            link(`${chapter.id}:in`, topicNodeId(chapter.id, topic.id));
            link(topicNodeId(chapter.id, topic.id), `${chapter.id}:out`);
        }
    }
    strict.forEach((p) => link(outKey(p.from), inKey(p.to)));

    // Is `target` reachable from `source` along strict prerequisites, optionally without the direct edge?
    const reachable = (source: string, target: string, avoidDirect: boolean) => {
        const seen = new Set<string>();
        const stack = (adjacency.get(source) ?? []).filter((next) => !avoidDirect || next !== target);
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node === target) return true;
            if (seen.has(node)) continue;
            seen.add(node);
            stack.push(...(adjacency.get(node) ?? []));
        }
        return false;
    };

    return [
        ...strict.filter((p) => !reachable(outKey(p.from), inKey(p.to), true)),
        ...soft.filter((p) => !reachable(outKey(p.from), inKey(p.to), false)),
    ];
}

// Turns prerequisites into drawn edges. An end inside a collapsed chapter attaches to its circle,
// and edges that end up between the same two nodes are merged, a strict edge winning over a soft one.
export function visibleEdges(prerequisites: Prerequisite[], openChapters: Set<string>, chapters: ChapterDoc[]): Edge[] {
    const edges = new Map<string, Edge>();
    for (const { from, to, soft } of prerequisites) {
        const source = from.topic && openChapters.has(from.chapter) ? topicNodeId(from.chapter, from.topic) : from.chapter;
        const target = to.topic && openChapters.has(to.chapter) ? topicNodeId(to.chapter, to.topic) : to.chapter;
        if (source === target) continue;

        // Within one chapter, follow the chapter's own flow direction; across chapters, go left to right
        const sameChapter = from.chapter === to.chapter;
        const vertical = sameChapter && chapters.find((c) => c.id === from.chapter)?.topicDirection === "DOWN";
        const id = `${source}->${target}`;
        if (soft && edges.has(id)) continue;
        edges.set(id, {
            id,
            source,
            target,
            sourceHandle: source.includes("/") && vertical ? "flow-out" : "out",
            targetHandle: target.includes("/") && vertical ? "flow-in" : "in",
            data: { internalTo: sameChapter && source.includes("/") ? from.chapter : undefined, soft: !!soft },
        });
    }
    return [...edges.values()];
}

// ---------------------------------------------------------------------------------------------
// Layout

export type ChapterPlacement = {
    position: XYPosition; // top-left of the open panel
    openSize: Size;
    topics: Node<TopicNodeData>[]; // positions relative to the panel
};

// Lays out the topics inside one chapter. On a portrait screen (aspectRatio < 1) both flow
// directions are tried and the one closer to the screen's shape wins.
async function layoutPanel(chapter: ChapterDoc, prerequisites: Prerequisite[], aspectRatio: number) {
    const topics = chapter.topics ?? [];
    if (topics.length === 0) return { size: emptyPanelSize, topics: [] as Node<TopicNodeData>[] };

    const preferred = chapter.topicDirection ?? "RIGHT";
    if (aspectRatio >= 1) return runPanelLayout(chapter, prerequisites, preferred);

    const other = preferred === "RIGHT" ? "DOWN" : "RIGHT";
    const [a, b] = await Promise.all([runPanelLayout(chapter, prerequisites, preferred), runPanelLayout(chapter, prerequisites, other)]);
    const misfit = (panel: { size: Size }) => Math.abs(Math.log(panel.size.width / panel.size.height / aspectRatio));
    return misfit(b) < misfit(a) ? b : a;
}

async function runPanelLayout(chapter: ChapterDoc, prerequisites: Prerequisite[], direction: "DOWN" | "RIGHT") {
    const topics = chapter.topics ?? [];
    const internal = prerequisites.filter((p) => p.from.chapter === chapter.id && p.to.chapter === chapter.id && p.from.topic && p.to.topic);
    const graph: ElkNode = {
        id: chapter.id,
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": direction,
            "elk.padding": `[top=${panelHeaderHeight + 8},left=${panelPadding},bottom=${panelPadding},right=${panelPadding}]`,
            "elk.spacing.nodeNode": "20",
            "elk.layered.spacing.nodeNodeBetweenLayers": "44",
            // One graph, so unlinked topics sit side by side instead of stacking
            "elk.separateConnectedComponents": "false",
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
        },
        children: topics.map((topic) => ({ id: topicNodeId(chapter.id, topic.id), ...topicSize })),
        edges: internal.map((p, i) => ({
            id: `e${i}`,
            sources: [topicNodeId(chapter.id, p.from.topic!)],
            targets: [topicNodeId(chapter.id, p.to.topic!)],
        })),
    };
    const laidOut = await elk.layout(graph);

    const size = {
        width: Math.max(laidOut.width ?? 0, emptyPanelSize.width),
        height: Math.max(laidOut.height ?? 0, emptyPanelSize.height),
    };
    // Centre the topics if the panel was widened to its minimum
    const offsetX = (size.width - (laidOut.width ?? 0)) / 2;
    const nodes: Node<TopicNodeData>[] = (laidOut.children ?? []).map((elkNode) => {
        const topic = topics.find((t) => topicNodeId(chapter.id, t.id) === elkNode.id)!;
        return {
            id: elkNode.id,
            type: "topic",
            parentId: chapter.id,
            extent: "parent",
            draggable: false,
            position: { x: (elkNode.x ?? 0) + offsetX, y: elkNode.y ?? 0 },
            // React Flow ignores the pointer on nodes it can't drag; topics need it for links and hover
            style: { ...topicSize, pointerEvents: "all" },
            initialWidth: topicSize.width,
            initialHeight: topicSize.height,
            data: { title: topic.title, color: chapter.color, direction, notes: topic.notes },
        };
    });
    return { size, topics: nodes };
}

// The fresh layout: every chapter open, sized to its topics, placed so nothing overlaps.
// `aspectRatio` is the canvas's width / height, so separate journeys pack to fit the screen.
export async function layoutTrail(chapters: ChapterDoc[], prerequisites: Prerequisite[], aspectRatio: number) {
    const panels = await Promise.all(chapters.map((chapter) => layoutPanel(chapter, prerequisites, aspectRatio)));

    // Chapters are placed as boxes; topic-level links count as links between their chapters
    const chapterLinks = new Set(
        prerequisites.filter((p) => p.from.chapter !== p.to.chapter).map((p) => `${p.from.chapter}->${p.to.chapter}`)
    );
    const graph: ElkNode = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.spacing.nodeNode": "48",
            "elk.layered.spacing.nodeNodeBetweenLayers": "96",
            "elk.spacing.componentComponent": "80",
            "elk.aspectRatio": String(aspectRatio),
            // Data order decides vertical order, and which journey is placed first
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
            "elk.layered.considerModelOrder.components": "MODEL_ORDER",
        },
        children: chapters.map((chapter, i) => ({ id: chapter.id, ...panels[i].size })),
        edges: [...chapterLinks].map((link) => {
            const [source, target] = link.split("->");
            return { id: link, sources: [source], targets: [target] };
        }),
    };
    const laidOut = await elk.layout(graph);

    const placements: Record<string, ChapterPlacement> = {};
    for (const elkNode of laidOut.children ?? []) {
        const i = chapters.findIndex((c) => c.id === elkNode.id);
        placements[elkNode.id] = { position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 }, openSize: panels[i].size, topics: panels[i].topics };
    }
    const bounds: Rect = { x: 0, y: 0, width: laidOut.width ?? 0, height: laidOut.height ?? 0 };
    return { placements, bounds };
}

// Collapsed, a chapter keeps its panel's top-centre: the circle sits where the panel's header was
export function collapsedRect(open: Rect): Rect {
    return { x: open.x + open.width / 2 - chapterSize.width / 2, y: open.y, ...chapterSize };
}
