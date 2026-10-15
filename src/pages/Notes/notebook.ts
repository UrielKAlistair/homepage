// Just enough of the .ipynb format to show notes: markdown cells, code cells and their outputs.

type Source = string | string[];
const text = (source: Source | undefined) => (Array.isArray(source) ? source.join("") : (source ?? ""));

export type Output =
    | { kind: "text"; text: string; error?: boolean }
    | { kind: "image"; src: string }
    | { kind: "html"; html: string };

export type Cell = { kind: "markdown"; source: string } | { kind: "code"; source: string; outputs: Output[] };

type RawOutput = {
    output_type: string;
    text?: Source;
    data?: Record<string, Source>;
    ename?: string;
    evalue?: string;
    traceback?: string[];
};
type RawCell = { cell_type: string; source: Source; outputs?: RawOutput[]; attachments?: Record<string, Record<string, string>> };

// Terminal colour codes (progress bars, tracebacks) mean nothing in a browser
// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

// Progress bars redraw a line with carriage returns; keep only what was finally shown
const settleCarriageReturns = (s: string) =>
    s
        .split("\n")
        .map((line) => line.split("\r").filter(Boolean).pop() ?? "")
        .join("\n");

function parseOutput(raw: RawOutput): Output | null {
    if (raw.output_type === "stream") return { kind: "text", text: settleCarriageReturns(stripAnsi(text(raw.text))) };
    if (raw.output_type === "error") return { kind: "text", text: stripAnsi((raw.traceback ?? [`${raw.ename}: ${raw.evalue}`]).join("\n")), error: true };
    const data = raw.data ?? {};
    for (const type of ["image/png", "image/jpeg", "image/gif"]) {
        if (data[type]) return { kind: "image", src: `data:${type};base64,${text(data[type]).replace(/\s/g, "")}` };
    }
    if (data["image/svg+xml"]) return { kind: "image", src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text(data["image/svg+xml"]))}` };
    if (data["text/html"]) return { kind: "html", html: text(data["text/html"]) };
    if (data["text/plain"]) return { kind: "text", text: stripAnsi(text(data["text/plain"])) };
    return null;
}

// Notebooks are written against MathJax, which is more forgiving than KaTeX. Outside existing
// math: bare \begin{...} environments become display math. Display math ($$...$$) is moved onto
// its own lines so markdown treats it as a block, as Jupyter does.
export function prepareMarkdown(source: string, attachments?: RawCell["attachments"]) {
    let out = "";
    let rest = source;
    // Inline math may wrap across lines (MathJax allows it), but never across a blank line
    const pattern = /\$\$[\s\S]+?\$\$|\$(?:[^$\n\\]|\\[\s\S]|\n(?![ \t]*\n))+?\$|\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/;
    for (let match = rest.match(pattern); match; match = rest.match(pattern)) {
        out += rest.slice(0, match.index);
        const found = match[0];
        if (found.startsWith("$$")) out += `\n\n$$\n${toKatex(found.slice(2, -2).trim())}\n$$\n\n`;
        else if (found.startsWith("$")) out += `$${toKatex(found.slice(1, -1).trim().replace(/\s*\n\s*/g, " "))}$`;
        else out += `\n\n$$\n${toKatex(found)}\n$$\n\n`;
        rest = rest.slice(match.index! + found.length);
    }
    out += rest;

    // Pasted images are stored on the cell and referenced as attachment:name
    for (const [name, files] of Object.entries(attachments ?? {})) {
        const [type, data] = Object.entries(files)[0] ?? [];
        if (type) out = out.split(`attachment:${name}`).join(`data:${type};base64,${data}`);
    }
    return out;
}

// The few MathJax-only environments the notes use, rewritten as their KaTeX equivalents
const toKatex = (math: string) => math.replace(/\\(begin|end)\{eqnarray\*?\}/g, (_, edge) => (edge === "begin" ? "\\begin{darray}{rcl}" : "\\end{darray}"));

export type Notebook = { cells: Cell[]; language: string };

export function parseNotebook(json: string): Notebook {
    const raw = JSON.parse(json) as { cells: RawCell[]; metadata?: { language_info?: { name?: string } } };
    const cells = raw.cells.flatMap((cell): Cell[] => {
        if (cell.cell_type === "markdown") return [{ kind: "markdown", source: prepareMarkdown(text(cell.source), cell.attachments) }];
        if (cell.cell_type === "code") {
            return [{ kind: "code", source: text(cell.source), outputs: (cell.outputs ?? []).map(parseOutput).filter((o): o is Output => o !== null) }];
        }
        return [];
    });
    return { cells, language: raw.metadata?.language_info?.name ?? "python" };
}
