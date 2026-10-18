// Writes a word in Imperial Script as an SVG the calligraphy
// component can animate: one <path> per letter (its holes included, so counters stay open),
// right to left, since the component draws the last path first.
//
// Run: node scripts/text-to-calligraphy-svg.mjs <font.ttf> "<text>" <out.svg>
// Needs opentype.js (npm install --no-save opentype.js) and Imperial Script from Google Fonts.
import { writeFileSync } from "node:fs";
import opentype from "opentype.js";

const fontSize = 90;
const tracking = 0.02; // extra space between letters, as a fraction of the font size
const padding = 6;

const [fontFile, text, outFile] = process.argv.slice(2);
const font = opentype.loadSync(fontFile);

// Lay the glyphs out by hand so tracking can be added
const outlines = [];
let x = 0;
const glyphs = font.stringToGlyphs(text);
glyphs.forEach((glyph, i) => {
    const path = glyph.getPath(x, fontSize, fontSize);
    if (path.commands.length) outlines.push(path.commands);
    const kerning = i < glyphs.length - 1 ? font.getKerningValue(glyph, glyphs[i + 1]) : 0;
    x += ((glyph.advanceWidth + kerning) / font.unitsPerEm) * fontSize + tracking * fontSize;
});

const toPath = (commands) => {
    const p = new opentype.Path();
    p.commands = commands;
    return p;
};
const boxes = outlines.map((o) => toPath(o).getBoundingBox());
const minX = Math.min(...boxes.map((b) => b.x1)) - padding;
const minY = Math.min(...boxes.map((b) => b.y1)) - padding;
const width = Math.max(...boxes.map((b) => b.x2)) - minX + padding;
const height = Math.max(...boxes.map((b) => b.y2)) - minY + padding;

const order = outlines.map((_, i) => i).sort((a, b) => boxes[b].x1 - boxes[a].x1);
const paths = order.map((i) => `<path d="${toPath(outlines[i]).toPathData(2)}" fill="white"/>`).join("\n");
writeFileSync(
    outFile,
    `<svg width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${paths}\n</svg>\n`
);
console.log(`${outFile}: ${outlines.length} letters, ${width.toFixed(0)}×${height.toFixed(0)}`);
