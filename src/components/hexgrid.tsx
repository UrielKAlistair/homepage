import { hexColumnWidth, hexPoints, hexRowHeight } from "@/lib/hexgrid";

// One repeating tile is two columns wide and one row tall. The even-column cell sits on the tile's
// corners (drawn four times so every quarter shows); the odd-column cell sits in the middle.
// The cells line up with hexCentre, so a pattern and individually drawn cells coincide exactly.
export const HexPattern = ({
    id,
    radius,
    transform,
    stroke,
    strokeWidth = 1,
}: {
    id: string;
    radius: number;
    transform?: string;
    stroke: string;
    strokeWidth?: number;
}) => {
    const width = 2 * hexColumnWidth(radius);
    const height = hexRowHeight(radius);
    const points = hexPoints(radius);
    const cells = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
        [width / 2, height / 2],
    ];
    return (
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" patternTransform={transform}>
            {cells.map(([x, y]) => (
                <polygon key={`${x},${y}`} points={points} transform={`translate(${x} ${y})`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
            ))}
        </pattern>
    );
};
