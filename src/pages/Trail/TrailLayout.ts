import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { ChapterDoc } from "./TrailData";
import type { TopicNodeData } from "./NodeTypes";

// Box sizes the layout reserves; NodeTypes renders into exactly these
export const chapterSize = { width: 160, height: 112 };
export const circleSize = 56;
const topicSize = { width: 168, height: 44 };
export const panelHeaderHeight = 64;
const panelPadding = 28;
const emptyPanelSize = { width: 300, height: 150 };

export type Size = { width: number; height: number };
export type Rect = XYPosition & Size;

const elk = new ELK();

export const topicNodeId = (chapterId: string, topicId: string) => `${chapterId}/${topicId}`;

// ---------------------------------------------------------------------------------------------
// Prerequisites

// One end of a prerequisite: a whole chapter, or one topic in it
export type Endpoint = { chapter: string; topic?: string };
export type Prerequisite = { from: Endpoint; to: Endpoint };

// Collects every declared prerequisite and keeps only the direct ones: an edge is dropped when
// a longer path already implies it. Each chapter is modelled as an entry point (its own
// requirements) and an exit point (what depends on it) with its topics in between, so chapter-
// and topic-level prerequisites mix: requiring a chapter implies requiring all of its topics.
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
        for (const topic of chapter.topics ?? []) {
            for (const ref of topic.requires ?? []) declared.push({ from: parse(ref, chapter.id), to: { chapter: chapter.id, topic: topic.id } });
        }
    }

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
    declared.forEach((p) => link(outKey(p.from), inKey(p.to)));

    // Is `target` reachable from `source` without using the direct edge source -> target?
    const reachableAvoidingDirect = (source: string, target: string) => {
        const seen = new Set<string>();
        const stack = (adjacency.get(source) ?? []).filter((next) => next !== target);
        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node === target) return true;
            if (seen.has(node)) continue;
            seen.add(node);
            stack.push(...(adjacency.get(node) ?? []));
        }
        return false;
    };

    return declared.filter((p) => !reachableAvoidingDirect(outKey(p.from), inKey(p.to)));
}

// Turns prerequisites into drawn edges. An end inside a collapsed chapter attaches to its circle,
// and edges that end up between the same two nodes are merged.
export function visibleEdges(prerequisites: Prerequisite[], openChapters: Set<string>, chapters: ChapterDoc[]): Edge[] {
    const edges = new Map<string, Edge>();
    for (const { from, to } of prerequisites) {
        const source = from.topic && openChapters.has(from.chapter) ? topicNodeId(from.chapter, from.topic) : from.chapter;
        const target = to.topic && openChapters.has(to.chapter) ? topicNodeId(to.chapter, to.topic) : to.chapter;
        if (source === target) continue;

        // Within one chapter, follow the chapter's own flow direction; across chapters, go left to right
        const sameChapter = from.chapter === to.chapter;
        const vertical = sameChapter && chapters.find((c) => c.id === from.chapter)?.topicDirection === "DOWN";
        const id = `${source}->${target}`;
        edges.set(id, {
            id,
            source,
            target,
            sourceHandle: source.includes("/") && vertical ? "flow-out" : "out",
            targetHandle: target.includes("/") && vertical ? "flow-in" : "in",
            data: { internalTo: sameChapter && source.includes("/") ? from.chapter : undefined },
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
            style: { ...topicSize },
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
