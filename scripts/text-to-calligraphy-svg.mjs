// Writes a word in a script font as an SVG the calligraphy
// component can animate: one <path> per letter (its holes included, so counters stay open),
// in reverse text order, since the component draws the last path first.
//
// The site's words are in Fontaine de Diamant by Cataleya Butcher (free for personal use; ask the
// designer before any commercial use), from fontspace.com or cufonfonts.com.
//
// Run: node scripts/text-to-calligraphy-svg.mjs <font.ttf> "<text>" <out.svg>
// Needs the font file; opentype.js is a dev dependency.
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const fontSize = 90;
const tracking = 0.02; // extra space between letters, as a fraction of the font size
const padding = 6;

const [fontFile, text, outFile] = process.argv.slice(2);
const bytes = readFileSync(fontFile);
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

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

// SVG path data for an outline (opentype.js's own toPathData writes NaN for some whole numbers)
const pathData = (commands) =>
    commands
        .map((c) => {
            const xy = (...pairs) => pairs.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
            if (c.type === "M" || c.type === "L") return c.type + xy([c.x, c.y]);
            if (c.type === "Q") return "Q" + xy([c.x1, c.y1], [c.x, c.y]);
            if (c.type === "C") return "C" + xy([c.x1, c.y1], [c.x2, c.y2], [c.x, c.y]);
            return "Z";
        })
        .join("");

const boxes = outlines.map((commands) => {
    const path = new opentype.Path();
    path.commands = commands;
    return path.getBoundingBox();
});
const minX = Math.min(...boxes.map((b) => b.x1)) - padding;
const minY = Math.min(...boxes.map((b) => b.y1)) - padding;
const width = Math.max(...boxes.map((b) => b.x2)) - minX + padding;
const height = Math.max(...boxes.map((b) => b.y2)) - minY + padding;

const paths = outlines
    .map((commands) => `<path d="${pathData(commands)}" fill="white"/>`)
    .reverse()
    .join("\n");
writeFileSync(
    outFile,
    `<svg width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${paths}\n</svg>\n`
);
console.log(`${outFile}: ${outlines.length} letters, ${width.toFixed(0)}×${height.toFixed(0)}`);
