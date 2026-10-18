import { hexCentre, hexColumnWidth, hexPoints as hexPolygon, hexRowHeight } from "@/lib/hexgrid";
import type { TrailColor } from "./TrailData";
import { domains } from "./TrailData";
import { territoryCellRadius as radius, territoryReach as reach } from "./TrailLayout";
import type { Rect } from "./TrailLayout";

// Territories on the hex grid. Every cell asks one question: which chapter am I closest to?
// The answer depends only on where the chapters are right now, so any arrangement, overlaps
// included, always draws the same way and fully reverts when things move apart.

export type TerritoryChapter = { id: string; rect: Rect; color: TrailColor; z: number };

const rowHeight = hexRowHeight(radius);
const columnWidth = hexColumnWidth(radius);
const gridBlock = 8; // the grid grows in blocks of cells, so dragging rarely rebuilds it

export const rgb: Record<TrailColor, string> = {
    orange: "251, 146, 60",
    red: "248, 113, 113",
    blue: "96, 165, 250",
    green: "52, 211, 153",
    white: "226, 232, 240",
};
// Solid but muted, so labels read as part of the background
export const labelColors: Record<TrailColor, string> = {
    orange: "#b9875f",
    red: "#b67272",
    blue: "#7193c2",
    green: "#6aa98a",
    white: "#9ba4b1",
};
const labelFontSize = 13;
const labelCharWidth = labelFontSize * 0.9; // glyph plus 0.3em tracking, a slight overestimate

export const hexPoints = hexPolygon(radius);
const cellCentre = (col: number, row: number) => hexCentre(col, row, radius);

// The six neighbours of a flat-topped cell in "odd columns shifted down" offset coordinates
const neighbours = (col: number, row: number): [number, number][] => {
    const shifted = Math.abs(col) % 2 === 1;
    return [
        [col, row - 1],
        [col, row + 1],
        [col - 1, shifted ? row : row - 1],
        [col - 1, shifted ? row + 1 : row],
        [col + 1, shifted ? row : row - 1],
        [col + 1, shifted ? row + 1 : row],
    ];
};

const distanceToRect = (x: number, y: number, r: Rect) => {
    const dx = Math.max(r.x - x, 0, x - (r.x + r.width));
    const dy = Math.max(r.y - y, 0, y - (r.y + r.height));
    return Math.hypot(dx, dy);
};

// `neighbours` holds the indices, in `cells`, of the neighbouring cells that are in the grid
export type GridCell = { key: string; col: number; row: number; x: number; y: number; neighbours: number[] };
export type Grid = { cols: [number, number]; rows: [number, number]; cells: GridCell[] };

// Covers the chapters plus reach, rounded out to whole blocks
export function gridExtent(chapters: TerritoryChapter[]) {
    const block = (value: number, size: number, round: (n: number) => number) => round(value / size / gridBlock) * gridBlock;
    const cols: [number, number] = [
        block(Math.min(...chapters.map((c) => c.rect.x)) - reach - radius, columnWidth, Math.floor),
        block(Math.max(...chapters.map((c) => c.rect.x + c.rect.width)) + reach + radius, columnWidth, Math.ceil),
    ];
    const rows: [number, number] = [
        block(Math.min(...chapters.map((c) => c.rect.y)) - reach - radius, rowHeight, Math.floor),
        block(Math.max(...chapters.map((c) => c.rect.y + c.rect.height)) + reach + radius, rowHeight, Math.ceil),
    ];
    return { cols, rows };
}

export function buildGrid({ cols, rows }: { cols: [number, number]; rows: [number, number] }): Grid {
    const height = rows[1] - rows[0] + 1;
    const indexOf = (col: number, row: number) =>
        col < cols[0] || col > cols[1] || row < rows[0] || row > rows[1] ? -1 : (col - cols[0]) * height + (row - rows[0]);
    const cells: GridCell[] = [];
    for (let col = cols[0]; col <= cols[1]; col++) {
        for (let row = rows[0]; row <= rows[1]; row++) {
            const around = neighbours(col, row).map(([c, r]) => indexOf(c, r)).filter((index) => index >= 0);
            cells.push({ key: `${col},${row}`, col, row, ...cellCentre(col, row), neighbours: around });
        }
    }
    return { cols, rows, cells };
}

export type CellLook = { color?: TrailColor; owner?: string; distance: number; level: number; frontier: boolean };

// One look per cell, in the order of grid.cells
export function computeOwners(grid: Grid, chapters: TerritoryChapter[]): CellLook[] {
    const looks = grid.cells.map((cell): CellLook => {
        let best: TerritoryChapter | undefined;
        let bestDistance = Infinity;
        for (const chapter of chapters) {
            const d = distanceToRect(cell.x, cell.y, chapter.rect);
            // Ties (e.g. a cell under two overlapping chapters) go to the one on top
            if (d < bestDistance - 0.5 || (Math.abs(d - bestDistance) <= 0.5 && best && chapter.z > best.z)) {
                best = chapter;
                bestDistance = d;
            }
        }
        const owned = best && bestDistance <= reach;
        // Three strength levels: under or beside a chapter, nearby, at the edge of reach
        const level = !owned ? 0 : bestDistance < reach / 3 ? 3 : bestDistance < (reach * 2) / 3 ? 2 : 1;
        return { color: owned ? best!.color : undefined, owner: owned ? best!.id : undefined, distance: bestDistance, level, frontier: false };
    });
    // Cells beyond the grid's edge count as unowned
    grid.cells.forEach((cell, i) => {
        const look = looks[i];
        if (look.color) look.frontier = cell.neighbours.length < 6 || cell.neighbours.some((n) => looks[n].color !== look.color);
    });
    return looks;
}

// Stronger near a chapter and along a territory's border
export function cellPaint(color: TrailColor, look: CellLook) {
    const fillOpacity = 0.012 + look.level * 0.012 + (look.frontier ? 0.012 : 0);
    const strokeOpacity = 0.05 + look.level * 0.03 + (look.frontier ? 0.06 : 0);
    return { fill: `rgba(${rgb[color]}, ${fillOpacity})`, stroke: `rgba(${rgb[color]}, ${strokeOpacity})` };
}

// One label per domain, at the top-left of its largest connected territory, where the whole
// label sits clear of every chapter
export function computeLabels(grid: Grid, looks: CellLook[], chapters: TerritoryChapter[]) {
    const seen = new Uint8Array(grid.cells.length);
    const largest = new Map<TrailColor, GridCell[]>();
    grid.cells.forEach((cell, start) => {
        const color = looks[start].color;
        if (!color || seen[start]) return;
        const region: GridCell[] = [];
        const queue = [start];
        seen[start] = 1;
        while (queue.length > 0) {
            const current = queue.pop()!;
            region.push(grid.cells[current]);
            for (const next of grid.cells[current].neighbours) {
                if (!seen[next] && looks[next].color === color) {
                    seen[next] = 1;
                    queue.push(next);
                }
            }
        }
        if (region.length > (largest.get(color)?.length ?? 0)) largest.set(color, region);
    });

    const labels: { color: TrailColor; x: number; y: number; text: string }[] = [];
    for (const [color, region] of largest) {
        const text = domains.find((d) => d.color === color)?.label.toUpperCase();
        if (!text) continue;
        const width = text.length * labelCharWidth;
        const clearOf = (x: number, y: number) =>
            chapters.every((c) => x + width < c.rect.x - 8 || x > c.rect.x + c.rect.width + 8 || y < c.rect.y - 8 || y - labelFontSize > c.rect.y + c.rect.height + 8);
        const spot = [...region]
            .sort((a, b) => a.y - b.y || a.x - b.x)
            .map((cell) => ({ x: cell.x - radius * 0.6, y: cell.y + 4 }))
            .find(({ x, y }) => clearOf(x, y));
        if (spot) labels.push({ color, ...spot, text });
    }
    return labels;
}
