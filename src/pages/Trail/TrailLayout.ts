import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { ChapterDoc, TrailColor } from "./TrailData";
import type { TopicNodeData } from "./NodeTypes";

// Box sizes the layout reserves; NodeTypes renders into exactly these
const topicSize = { width: 168, height: 44 };
export const panelHeaderHeight = 64;
const panelPadding = 28;
const emptyPanelSize = { width: 300, height: 150 };

// The home page's panel frames the chapters above the Physics row (see previewFraming); this
// zooms it out from that: 1 fits them exactly, 1.2 shows 20% more of the map
const previewZoomOut = 1.15;

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

// How the full-size map shows an area on a canvas of this size: all of it, if it can be read that
// small; otherwise at the smallest readable zoom, starting from its left edge
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

// The map in the home page's panel: from its top-left corner down to the territory of the lowest
// chapter above the Physics row; Physics is left for the full map to reveal. Growing to full
// size, the map starts from this view and zooms out to `framing`.
const previewHorizonColor: TrailColor = "blue";
export function previewFraming(chapters: { rect: Rect; color: TrailColor }[], canvas: Size): Viewport {
    const area = withTerritory(boundsOf(chapters.map((c) => c.rect)));
    const physicsTop = Math.min(...chapters.filter((c) => c.color === previewHorizonColor).map((c) => c.rect.y));
    const above = chapters.filter((c) => c.rect.y + c.rect.height < physicsTop).map((c) => c.rect.y + c.rect.height + territoryReach);
    const horizon = above.length ? Math.max(...above) : area.y + area.height;
    // Physics dragged up near the top would leave a sliver: show the whole map then
    const fitted = horizon - area.y > area.height * 0.3 ? horizon - area.y : area.height;
    const height = Math.min(area.height, fitted * previewZoomOut);
    const zoom = canvas.height / height;
    const spare = Math.max(0, canvas.width / zoom - area.width); // a view wider than the map is centred on it
    return { x: -(area.x - spare / 2) * zoom, y: -area.y * zoom, zoom };
}

const topicNodeId = (chapterId: string, topicId: string) => `${chapterId}/${topicId}`;

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

// Turns direct prerequisites into edges between their chapter or topic endpoints.
export function trailEdges(prerequisites: Prerequisite[], chapters: ChapterDoc[]): Edge[] {
    return prerequisites.map(({ from, to, soft }) => {
        const source = from.topic ? topicNodeId(from.chapter, from.topic) : from.chapter;
        const target = to.topic ? topicNodeId(to.chapter, to.topic) : to.chapter;

        // Within one chapter, follow the chapter's own flow direction; across chapters, go left to right
        const sameChapter = from.chapter === to.chapter;
        const vertical = sameChapter && chapters.find((c) => c.id === from.chapter)?.topicDirection === "DOWN";
        const id = `${source}->${target}`;
        return {
            id,
            source,
            target,
            sourceHandle: source.includes("/") && vertical ? "flow-out" : "out",
            targetHandle: target.includes("/") && vertical ? "flow-in" : "in",
            data: { soft: !!soft },
        };
    });
}

// ---------------------------------------------------------------------------------------------
// Layout

export type ChapterPlacement = {
    position: XYPosition; // top-left of the panel
    size: Size;
    topics: Node<TopicNodeData>[]; // positions relative to the panel
};

// Gaps, in flow units
const topicGap = 20; // between topics in the same column of a chapter
const topicColumnGap = 44; // between a chapter's columns of topics
const chapterGap = 48; // between chapters in the same column
const columnGap = 96; // between columns of chapters
const journeyGap = 80; // between journeys: groups of chapters with no links between them

// Columns for a set of items linked by prerequisites: each item's column is the length of the
// longest chain of prerequisites leading to it, so every link points to a later column
function columnsOf(ids: string[], links: [string, string][]) {
    const before = new Map(ids.map((id) => [id, links.filter(([, to]) => to === id).map(([from]) => from)]));
    const column = new Map<string, number>();
    const visit = (id: string): number => {
        if (!column.has(id)) column.set(id, Math.max(-1, ...before.get(id)!.map(visit)) + 1);
        return column.get(id)!;
    };
    ids.forEach(visit);
    return { column, before };
}

// Lays out the topics inside one chapter. On a portrait screen (aspectRatio < 1) both flow
// directions are tried and the one closer to the screen's shape wins.
function layoutPanel(chapter: ChapterDoc, prerequisites: Prerequisite[], aspectRatio: number) {
    const topics = chapter.topics ?? [];
    if (topics.length === 0) return { size: emptyPanelSize, topics: [] as Node<TopicNodeData>[] };

    const preferred = chapter.topicDirection ?? "RIGHT";
    if (aspectRatio >= 1) return placeTopics(chapter, prerequisites, preferred);
    const other = preferred === "RIGHT" ? "DOWN" : "RIGHT";
    const [a, b] = [placeTopics(chapter, prerequisites, preferred), placeTopics(chapter, prerequisites, other)];
    const misfit = (panel: { size: Size }) => Math.abs(Math.log(panel.size.width / panel.size.height / aspectRatio));
    return misfit(b) < misfit(a) ? b : a;
}

// Topics flow in `direction` column by column; within a column each sits level with the middle
// of its prerequisites where there's room, so a topic lines up with what leads to it
function placeTopics(chapter: ChapterDoc, prerequisites: Prerequisite[], direction: "DOWN" | "RIGHT") {
    const topics = chapter.topics ?? [];
    const ids = topics.map((t) => t.id);
    const links = prerequisites
        .filter((p) => p.from.chapter === chapter.id && p.to.chapter === chapter.id && p.from.topic && p.to.topic)
        .map((p): [string, string] => [p.from.topic!, p.to.topic!]);
    const { column, before } = columnsOf(ids, links);

    // "Along" runs from column to column, "across" within a column
    const along = direction === "RIGHT" ? topicSize.width : topicSize.height;
    const across = direction === "RIGHT" ? topicSize.height : topicSize.width;
    const offset = new Map<string, number>(); // across, of each topic's start
    const columns = Math.max(...column.values()) + 1;
    for (let c = 0; c < columns; c++) {
        const inColumn = ids
            .filter((id) => column.get(id) === c)
            .map((id) => {
                const leads = before.get(id)!.map((from) => offset.get(from)!);
                const wanted = leads.length ? leads.reduce((sum, o) => sum + o, 0) / leads.length : -Infinity;
                return { id, wanted };
            })
            .sort((a, b) => a.wanted - b.wanted || ids.indexOf(a.id) - ids.indexOf(b.id));
        let next = 0;
        for (const { id, wanted } of inColumn) {
            const start = Math.max(wanted, next);
            offset.set(id, start);
            next = start + across + topicGap;
        }
    }

    const contentAlong = columns * along + (columns - 1) * topicColumnGap;
    const contentAcross = Math.max(...ids.map((id) => offset.get(id)! + across));
    const content = direction === "RIGHT" ? { width: contentAlong, height: contentAcross } : { width: contentAcross, height: contentAlong };
    const top = panelHeaderHeight + 8;
    const size = {
        width: Math.max(content.width + panelPadding * 2, emptyPanelSize.width),
        height: Math.max(content.height + top + panelPadding, emptyPanelSize.height),
    };
    // Centred across the panel if it was widened to its minimum
    const left = (size.width - content.width) / 2;

    const nodes: Node<TopicNodeData>[] = topics.map((topic, index) => {
        const a = column.get(topic.id)! * (along + topicColumnGap);
        const b = offset.get(topic.id)!;
        return {
            id: topicNodeId(chapter.id, topic.id),
            type: "topic",
            parentId: chapter.id,
            extent: "parent",
            draggable: false,
            position: direction === "RIGHT" ? { x: left + a, y: top + b } : { x: left + b, y: top + a },
            // React Flow ignores the pointer on nodes it can't drag; topics need it for links and hover
            style: { ...topicSize, pointerEvents: "all" },
            initialWidth: topicSize.width,
            initialHeight: topicSize.height,
            data: { title: topic.title, color: chapter.color, direction, index, notes: topic.notes },
        };
    });
    return { size, topics: nodes };
}

// The fresh layout: every chapter sized to its topics, placed so nothing overlaps.
// Chapters linked by prerequisites form a journey, laid out in columns that read left to right;
// journeys are then packed in rows. `aspectRatio` is the canvas's width / height: the rows are
// as wide as gives the overall shape closest to it.
export function layoutTrail(chapters: ChapterDoc[], prerequisites: Prerequisite[], aspectRatio: number) {
    const panels = new Map(chapters.map((chapter) => [chapter.id, layoutPanel(chapter, prerequisites, aspectRatio)]));
    const sizeOf = (id: string) => panels.get(id)!.size;
    const order = chapters.map((c) => c.id);

    // Topic-level links count as links between their chapters
    const links = [...new Set(prerequisites.filter((p) => p.from.chapter !== p.to.chapter).map((p) => `${p.from.chapter}->${p.to.chapter}`))].map(
        (link) => link.split("->") as [string, string]
    );

    // Journeys: chapters connected by links, in the order of their first chapter
    const journeyOf = new Map(order.map((id) => [id, id]));
    const root = (id: string): string => (journeyOf.get(id) === id ? id : root(journeyOf.get(id)!));
    for (const [from, to] of links) journeyOf.set(root(from), root(to));
    const journeys = [...new Set(order.map(root))].map((r) => order.filter((id) => root(id) === r));

    // Each journey on its own, from (0, 0)
    const laidOut = journeys.map((ids) => {
        const own = links.filter(([from]) => ids.includes(from));
        const { column, before } = columnsOf(ids, own);
        const hasLater = new Set(own.map(([from]) => from));
        const position = new Map<string, XYPosition>();
        const columns = Math.max(...column.values()) + 1;
        let x = 0;
        for (let c = 0; c < columns; c++) {
            // Ordered by where their prerequisites sit, then as listed
            const rank = (id: string) => {
                const leads = before.get(id)!.map((from) => position.get(from)!.y);
                return leads.length ? leads.reduce((sum, y) => sum + y, 0) / leads.length : -Infinity;
            };
            const inColumn = ids.filter((id) => column.get(id) === c).sort((a, b) => rank(a) - rank(b) || order.indexOf(a) - order.indexOf(b));
            const width = Math.max(...inColumn.map((id) => sizeOf(id).width));
            let next = 0;
            for (const id of inColumn) {
                // Level with the middle prerequisite where there's room
                const leads = before.get(id)!.map((from) => position.get(from)!.y).sort((a, b) => a - b);
                const wanted = leads.length ? leads[Math.floor((leads.length - 1) / 2)] : 0;
                const y = Math.max(wanted, next);
                // Chapters that only lead on sit against the next column, the rest against the last
                const starts = before.get(id)!.length === 0 && hasLater.has(id);
                position.set(id, { x: starts ? x + width - sizeOf(id).width : x, y });
                next = y + sizeOf(id).height + chapterGap;
            }
            x += width + columnGap;
        }
        const bounds = boundsOf(ids.map((id) => ({ ...position.get(id)!, ...sizeOf(id) })));
        return { ids, position, width: bounds.width, height: bounds.height };
    });

    // Rows of journeys: try each row width the journeys allow and keep the closest to the screen's shape
    const pack = (rowWidth: number) => {
        const offsets: XYPosition[] = [];
        let x = 0, y = 0, rowHeight = 0, width = 0;
        for (const journey of laidOut) {
            if (x > 0 && x + journey.width > rowWidth) {
                y += rowHeight + journeyGap;
                x = 0;
                rowHeight = 0;
            }
            offsets.push({ x, y });
            width = Math.max(width, x + journey.width);
            rowHeight = Math.max(rowHeight, journey.height);
            x += journey.width + journeyGap;
        }
        return { offsets, width, height: y + rowHeight };
    };
    let running = -journeyGap;
    const candidates = laidOut.map((journey) => (running += journeyGap + journey.width));
    const misfit = (packed: { width: number; height: number }) => Math.abs(Math.log(packed.width / packed.height / aspectRatio));
    const best = candidates.map(pack).reduce((a, b) => (misfit(b) < misfit(a) ? b : a));

    const placements: Record<string, ChapterPlacement> = {};
    laidOut.forEach((journey, j) => {
        for (const id of journey.ids) {
            const at = journey.position.get(id)!;
            const panel = panels.get(id)!;
            placements[id] = { position: { x: best.offsets[j].x + at.x, y: best.offsets[j].y + at.y }, size: panel.size, topics: panel.topics };
        }
    });
    const bounds: Rect = { x: 0, y: 0, width: best.width, height: best.height };
    return { placements, bounds };
}

