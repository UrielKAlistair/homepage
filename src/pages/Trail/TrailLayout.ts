import type { Edge, Node, XYPosition } from "@xyflow/react";
import { isPhone } from "@/lib/layout";
import { previewChapters, topicsOf } from "./TrailData";
import type { ChapterDoc, Topic, TrailColor } from "./TrailData";
import type { TopicNodeData } from "./NodeTypes";
import { notebooks } from "../Notes/notesIndex";

// Box sizes the layout reserves; NodeTypes renders into exactly these
const topicHeight = 44;
// A topic box, left to right (as NodeTypes draws it): border, padding, dot, gap, title, then for a
// topic with notes a gap and the link icon, padding, border. Every topic in a chapter is as wide
// as its widest.
const topicChrome = 1 + 14 + 6 + 10 + 14 + 1;
const topicLinkSpace = 24 + 14; // the gap after the title, and the icon
const titlePadding = 13; // either side of a chapter's title, in its bar: about 1.4 characters
const panelPadding = 28;
const emptyPanelSize = { width: 220, height: 120 }; // the width is right of the title bar

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
const minReadableZoom = () => (isPhone() ? 0.6 : 0.5);
const viewPadding = 24;
const fitPadding = 0.08; // as a share of the area, the way React Flow's fitBounds pads
const resetButtonClearance = 60; // top padding when starting from the top-left, so the Reset button covers nothing
// px: on phones the map opens (in the home panel and full size) with the chapters' left edge this
// far from the frame's; negative starts partway in
const phoneLeadIn = 10;

export type Viewport = { x: number; y: number; zoom: number };

// How the full-size map shows an area on a canvas of this size: all of it, if it can be read that
// small; otherwise at the smallest readable zoom, starting from its left edge. On phones that
// start skips the territory margin and opens on the chapters themselves, so the narrow screen
// isn't spent on empty fabric.
export function framing(area: Rect, canvas: Size): Viewport {
    const fitZoom = Math.min((canvas.width - viewPadding * 2) / area.width, (canvas.height - viewPadding * 2) / area.height);
    if (fitZoom >= minReadableZoom()) {
        const zoom = Math.min(canvas.width / (area.width * (1 + fitPadding)), canvas.height / (area.height * (1 + fitPadding)));
        return { x: canvas.width / 2 - (area.x + area.width / 2) * zoom, y: canvas.height / 2 - (area.y + area.height / 2) * zoom, zoom };
    }
    const zoom = minReadableZoom();
    const fitsVertically = area.height * zoom <= canvas.height - viewPadding * 2;
    return {
        x: isPhone() ? phoneLeadIn - (area.x + territoryMargin) * zoom : viewPadding - area.x * zoom,
        y: fitsVertically ? (canvas.height - area.height * zoom) / 2 - area.y * zoom : resetButtonClearance - area.y * zoom,
        zoom,
    };
}

// The map in the home page's panel. On wide screens: the preview chapters with their territory,
// all of them, centred. On phones: from the top-left corner down to the territory of the lowest
// chapter above the Physics row (Physics is left for the full map to reveal), starting
// phoneLeadIn from the chapters' left edge. Growing to full size, the map starts from this view
// and zooms out to `framing`.
const previewHorizonColor: TrailColor = "blue";
export function previewFraming(chapters: { id: string; rect: Rect; color: TrailColor }[], canvas: Size): Viewport {
    if (!isPhone()) {
        const shown = withTerritory(boundsOf(chapters.filter((c) => previewChapters.includes(c.id)).map((c) => c.rect)));
        const zoom = Math.min(canvas.width / shown.width, canvas.height / shown.height);
        return { x: canvas.width / 2 - (shown.x + shown.width / 2) * zoom, y: canvas.height / 2 - (shown.y + shown.height / 2) * zoom, zoom };
    }
    const area = withTerritory(boundsOf(chapters.map((c) => c.rect)));
    const physicsTop = Math.min(...chapters.filter((c) => c.color === previewHorizonColor).map((c) => c.rect.y));
    const above = chapters.filter((c) => c.rect.y + c.rect.height < physicsTop).map((c) => c.rect.y + c.rect.height + territoryReach);
    const horizon = above.length ? Math.max(...above) : area.y + area.height;
    // Physics dragged up near the top would leave a sliver: show the whole map then
    const fitted = horizon - area.y > area.height * 0.3 ? horizon - area.y : area.height;
    const height = Math.min(area.height, fitted * previewZoomOut);
    const zoom = canvas.height / height;
    const x = phoneLeadIn - (area.x + territoryMargin) * zoom;
    return { x, y: -area.y * zoom, zoom };
}

const topicNodeId = (chapterId: string, topicId: string) => `${chapterId}/${topicId}`;

// ---------------------------------------------------------------------------------------------
// Prerequisites

// One end of a prerequisite: a whole chapter, one section of it, or one topic in it
export type Endpoint = { chapter: string; section?: string; topic?: string };
export type Prerequisite = { from: Endpoint; to: Endpoint; soft?: boolean };

// Collects every declared prerequisite and keeps only the direct ones: an edge is dropped when
// a longer strict path already implies it. Each chapter is modelled as an entry point (its own
// requirements) and an exit point (what depends on it) with its topics in between, so chapter-
// and topic-level prerequisites mix: requiring a chapter implies requiring all of its topics.
// A section is modelled the same way, between its chapter's entry and exit points.
// Soft prerequisites never make a strict one redundant, but are dropped when a strict path covers them.
export function directPrerequisites(chapters: ChapterDoc[]): Prerequisite[] {
    const declared: Prerequisite[] = [];
    const parse = (ref: string, ownChapter?: string): Endpoint => {
        const [first, second] = ref.split("/");
        if (second !== undefined) {
            const isSection = chapters.find((c) => c.id === first)?.sections?.some((s) => s.id === second);
            return isSection ? { chapter: first, section: second } : { chapter: first, topic: second };
        }
        const own = chapters.find((c) => c.id === ownChapter);
        if (ownChapter && own && topicsOf(own).some((t) => t.id === first)) {
            return { chapter: ownChapter, topic: first };
        }
        return { chapter: first };
    };
    for (const chapter of chapters) {
        for (const ref of chapter.requires ?? []) declared.push({ from: parse(ref), to: { chapter: chapter.id } });
        for (const ref of chapter.softRequires ?? []) declared.push({ from: parse(ref), to: { chapter: chapter.id }, soft: true });
        for (const topic of topicsOf(chapter)) {
            const to = { chapter: chapter.id, topic: topic.id };
            for (const ref of topic.requires ?? []) declared.push({ from: parse(ref, chapter.id), to });
            for (const ref of topic.softRequires ?? []) declared.push({ from: parse(ref, chapter.id), to, soft: true });
        }
    }
    const strict = declared.filter((p) => !p.soft);
    const soft = declared.filter((p) => p.soft);

    // Graph nodes: "c:in", "c:out" per chapter, "c:s:in", "c:s:out" per section and "c/t" per topic
    const pointKey = (e: Endpoint, side: "in" | "out") =>
        e.topic ? topicNodeId(e.chapter, e.topic) : e.section ? `${e.chapter}:${e.section}:${side}` : `${e.chapter}:${side}`;
    const outKey = (e: Endpoint) => pointKey(e, "out");
    const inKey = (e: Endpoint) => pointKey(e, "in");
    const adjacency = new Map<string, string[]>();
    const link = (a: string, b: string) => adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    const linkThrough = (from: string, to: string, topics: Topic[], chapterId: string) => {
        link(from, to);
        for (const topic of topics) {
            link(from, topicNodeId(chapterId, topic.id));
            link(topicNodeId(chapterId, topic.id), to);
        }
    };
    for (const chapter of chapters) {
        const [enter, exit] = [`${chapter.id}:in`, `${chapter.id}:out`];
        if (chapter.sections) {
            link(enter, exit);
            for (const section of chapter.sections) {
                const [sectionIn, sectionOut] = [`${chapter.id}:${section.id}:in`, `${chapter.id}:${section.id}:out`];
                link(enter, sectionIn);
                link(sectionOut, exit);
                linkThrough(sectionIn, sectionOut, section.topics, chapter.id);
            }
        } else {
            linkThrough(enter, exit, chapter.topics ?? [], chapter.id);
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

// How topics flow in each group of a chapter: its sections, or the chapter as one group
const groupsOf = (chapter: ChapterDoc) =>
    chapter.sections?.map((s) => ({ id: s.id as string | undefined, topics: s.topics, direction: s.topicDirection ?? "RIGHT" })) ??
    [{ id: undefined, topics: chapter.topics ?? [], direction: chapter.topicDirection ?? "RIGHT" }];

// Turns direct prerequisites into edges between their endpoints. A section's edges meet its
// chapter's panel, at handles beside the section's band; links between topics in two sections of
// one chapter run up or down, the way the sections are stacked.
export function trailEdges(prerequisites: Prerequisite[], chapters: ChapterDoc[]): Edge[] {
    return prerequisites.map(({ from, to, soft }) => {
        const source = from.topic ? topicNodeId(from.chapter, from.topic) : from.chapter;
        const target = to.topic ? topicNodeId(to.chapter, to.topic) : to.chapter;

        // Within one group of topics, follow its own flow direction; otherwise go left to right
        const groups = groupsOf(chapters.find((c) => c.id === from.chapter)!);
        const groupOf = (topic?: string) => groups.findIndex((g) => g.topics.some((t) => t.id === topic));
        const [fromGroup, toGroup] = [groupOf(from.topic), from.chapter === to.chapter ? groupOf(to.topic) : -1];
        const vertical = fromGroup >= 0 && fromGroup === toGroup && groups[fromGroup].direction === "DOWN";
        const across = fromGroup >= 0 && toGroup >= 0 && fromGroup !== toGroup ? (toGroup < fromGroup ? "up" : "down") : null;
        const sourceHandle = vertical ? "flow-out" : across ? `${across}-out` : from.section ? `out-${from.section}` : "out";
        const targetHandle = vertical ? "flow-in" : across ? `${across}-in` : to.section ? `in-${to.section}` : "in";
        return {
            // Two sections of one chapter share its node, so their edges differ only by handle
            id: `${source}:${sourceHandle}->${target}:${targetHandle}`,
            source,
            target,
            sourceHandle,
            targetHandle,
            data: { soft: !!soft },
        };
    });
}

// ---------------------------------------------------------------------------------------------
// Layout

// A section's band across its panel, from the panel's top
export type SectionBand = { id: string; top: number; height: number };

export type ChapterPlacement = {
    position: XYPosition; // top-left of the panel
    size: Size;
    titleWidth: number; // of the title bar down its left side
    topics: Node<TopicNodeData>[]; // positions relative to the panel
    sections: SectionBand[];
};

// Gaps, in flow units
const topicGap = 20; // between topics in the same column of a chapter
const topicColumnGap = 44; // between a chapter's columns of topics
const sectionGap = 56; // between a chapter's sections; their dividing line runs through the middle
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

// Text width in the page's own font family, at a CSS font weight and size
let measurer: CanvasRenderingContext2D | null = null;
function textWidth(text: string, weight: number, size: number) {
    measurer ??= document.createElement("canvas").getContext("2d")!;
    measurer.font = `${weight} ${size}px ${getComputedStyle(document.body).fontFamily}`;
    return measurer.measureText(text).width;
}

// A chapter's title bar is as wide as the longest word of its title (the title wraps at every
// space), in the title's font: semibold 16px
const titleBarWidth = (title: string) => Math.ceil(Math.max(...title.split(" ").map((word) => textWidth(word, 600, 16)))) + titlePadding * 2;

// The width of every topic box in a chapter: its widest topic's, titles in 14px
const topicWidthOf = (topics: Topic[]) =>
    Math.ceil(Math.max(...topics.map((t) => textWidth(t.title, 400, 14) + topicChrome + (t.notes && notebooks[t.notes] ? topicLinkSpace : 0))));

// Lays out the topics inside one chapter. On a portrait screen (aspectRatio < 1) a chapter without
// sections tries both flow directions, and the one closer to the screen's shape wins.
function layoutPanel(chapter: ChapterDoc, prerequisites: Prerequisite[], aspectRatio: number) {
    if (topicsOf(chapter).length === 0) {
        const titleWidth = titleBarWidth(chapter.title);
        const size = { width: titleWidth + emptyPanelSize.width, height: emptyPanelSize.height };
        return { size, titleWidth, topics: [] as Node<TopicNodeData>[], sections: [] };
    }

    const preferred = chapter.topicDirection ?? "RIGHT";
    if (aspectRatio >= 1 || chapter.sections) return placePanel(chapter, prerequisites, groupsOf(chapter));
    const other: typeof preferred = preferred === "RIGHT" ? "DOWN" : "RIGHT";
    const [a, b] = [preferred, other].map((direction: typeof preferred) =>
        placePanel(chapter, prerequisites, [{ id: undefined, topics: chapter.topics!, direction }])
    );
    const misfit = (panel: { size: Size }) => Math.abs(Math.log(panel.size.width / panel.size.height / aspectRatio));
    return misfit(b) < misfit(a) ? b : a;
}

// The panel around its groups of topics: right of the title, with the groups stacked top to
// bottom and centred across the rest of the panel
function placePanel(chapter: ChapterDoc, prerequisites: Prerequisite[], groups: ReturnType<typeof groupsOf>) {
    const topicSize = { width: topicWidthOf(topicsOf(chapter)), height: topicHeight };
    const placed = groups.map((group) => placeTopics(chapter.id, group.topics, prerequisites, group.direction, topicSize));
    const left = titleBarWidth(chapter.title);
    const top = panelPadding;

    const contentWidth = Math.max(...placed.map((p) => p.size.width));
    const contentHeight = placed.reduce((sum, p) => sum + p.size.height, 0) + (placed.length - 1) * sectionGap;
    const size = {
        width: left + Math.max(contentWidth + panelPadding * 2, emptyPanelSize.width),
        height: Math.max(top + contentHeight + panelPadding, emptyPanelSize.height),
    };

    const all = topicsOf(chapter);
    const topics: Node<TopicNodeData>[] = [];
    const sections: SectionBand[] = [];
    let y = top;
    groups.forEach((group, g) => {
        const { size: content, offsets, direction } = placed[g];
        const x = left + (size.width - left - content.width) / 2;
        for (const topic of group.topics) {
            const offset = offsets.get(topic.id)!;
            topics.push({
                id: topicNodeId(chapter.id, topic.id),
                type: "topic",
                parentId: chapter.id,
                extent: "parent",
                draggable: false,
                position: { x: x + offset.x, y: y + offset.y },
                // React Flow ignores the pointer on nodes it can't drag; topics need it for links and hover
                style: { ...topicSize, pointerEvents: "all" },
                initialWidth: topicSize.width,
                initialHeight: topicSize.height,
                data: { title: topic.title, color: chapter.color, direction, index: all.indexOf(topic), notes: topic.notes, hint: topic.hint },
            });
        }
        // Bands meet halfway across the gap between sections; the first and last reach the panel's edges
        if (group.id) {
            const bandTop = g === 0 ? 0 : y - sectionGap / 2;
            const bandBottom = g === groups.length - 1 ? size.height : y + content.height + sectionGap / 2;
            sections.push({ id: group.id, top: bandTop, height: bandBottom - bandTop });
        }
        y += content.height + sectionGap;
    });
    return { size, titleWidth: left, topics, sections };
}

// Topics flow in `direction` column by column; within a column each sits level with the middle
// of its prerequisites where there's room, so a topic lines up with what leads to it.
// Offsets are from the top-left of the topics' own bounds.
function placeTopics(chapterId: string, topics: Topic[], prerequisites: Prerequisite[], direction: "DOWN" | "RIGHT", topicSize: Size) {
    const ids = topics.map((t) => t.id);
    const links = prerequisites
        .filter((p) => p.from.chapter === chapterId && p.to.chapter === chapterId && ids.includes(p.from.topic!) && ids.includes(p.to.topic!))
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
    const size = direction === "RIGHT" ? { width: contentAlong, height: contentAcross } : { width: contentAcross, height: contentAlong };
    const offsets = new Map(
        ids.map((id) => {
            const a = column.get(id)! * (along + topicColumnGap);
            const b = offset.get(id)!;
            return [id, direction === "RIGHT" ? { x: a, y: b } : { x: b, y: a }];
        })
    );
    return { size, offsets, direction };
}

// The fresh layout: every chapter sized to its topics. On wide screens each chapter sits where it
// was placed by hand (`at`), as long as every chapter has a place; otherwise, and on phones, they
// are placed so nothing overlaps.
// Chapters linked by prerequisites form a journey, laid out in columns that read left to right;
// journeys are then packed in rows. `aspectRatio` is the canvas's width / height: the rows are
// as wide as gives the overall shape closest to it.
export function layoutTrail(chapters: ChapterDoc[], prerequisites: Prerequisite[], aspectRatio: number) {
    const panels = new Map(chapters.map((chapter) => [chapter.id, layoutPanel(chapter, prerequisites, aspectRatio)]));
    const placedAt = (positions: Map<string, XYPosition>) => {
        const placements: Record<string, ChapterPlacement> = {};
        for (const [id, position] of positions) {
            const { size, titleWidth, topics, sections } = panels.get(id)!;
            placements[id] = { position, size, titleWidth, topics, sections };
        }
        return placements;
    };
    if (!isPhone() && chapters.every((c) => c.at)) {
        const placements = placedAt(new Map(chapters.map((c) => [c.id, c.at!])));
        return { placements, bounds: boundsOf(Object.values(placements).map((p) => ({ ...p.position, ...p.size }))) };
    }

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

    const placements = placedAt(
        new Map(
            laidOut.flatMap((journey, j) =>
                journey.ids.map((id): [string, XYPosition] => {
                    const at = journey.position.get(id)!;
                    return [id, { x: best.offsets[j].x + at.x, y: best.offsets[j].y + at.y }];
                })
            )
        )
    );
    const bounds: Rect = { x: 0, y: 0, width: best.width, height: best.height };
    return { placements, bounds };
}

