// A flat-topped hexagonal grid in "odd columns shifted down" layout: the fabric behind the trail
// (and anything else that wants it). Cells are drawn slightly small, leaving hairline gaps.

export const hexCellScale = 0.9;

export const hexRowHeight = (radius: number) => Math.sqrt(3) * radius;
export const hexColumnWidth = (radius: number) => 1.5 * radius;

export const hexCentre = (col: number, row: number, radius: number) => ({
    x: col * hexColumnWidth(radius),
    y: row * hexRowHeight(radius) + (Math.abs(col) % 2 === 1 ? hexRowHeight(radius) / 2 : 0),
});

export const hexPoints = (radius: number) => {
    const r = radius * hexCellScale;
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i;
        return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
    }).join(" ");
};
