import { memo, useEffect, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import "katex/dist/katex.min.css";
import Navbar from "@/components/navbar";
import { chapters } from "../Trail/TrailData";
import { chapterColors } from "../Trail/TrailTheme";
import { parseNotebook } from "./notebook";
import type { Cell, Notebook, Output } from "./notebook";
import { colabUrl, notebooks } from "./notesIndex";

hljs.registerLanguage("python", python);

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeRaw, rehypeKatex];
// The notes are my own, so their embedded images (data: URLs) are allowed through
const urlTransform = (url: string) => (url.startsWith("data:image/") ? url : defaultUrlTransform(url));

// Where these notes sit on the trail, for the page heading
function placeOnTrail(slug: string) {
    for (const chapter of chapters) {
        if (chapter.notes === slug) return { title: chapter.title, chapter: undefined, color: chapter.color };
        const topic = chapter.topics?.find((t) => t.notes === slug);
        if (topic) return { title: topic.title, chapter: chapter.title, color: chapter.color };
    }
    return null;
}

// Headings are found once from the source, so the contents list and the rendered headings agree on ids
type Heading = { id: string; level: number; text: string };
const headingId = (cell: number, line: number) => `section-${cell}-${line}`;

function findHeadings(cells: Cell[]): Heading[] {
    const headings: Heading[] = [];
    cells.forEach((cell, index) => {
        if (cell.kind !== "markdown") return;
        let fenced = false;
        cell.source.split("\n").forEach((line, i) => {
            if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
            const match = !fenced && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
            if (match) headings.push({ id: headingId(index, i + 1), level: match[1].length, text: match[2] });
        });
    });
    return headings;
}

const InlineMarkdown = ({ children }: { children: string }) => (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <>{children}</> }}>
        {children}
    </ReactMarkdown>
);

// Notebooks differ in which heading level they start at; the top one always shows as an h2 here
function headingComponents(cell: number, shift: number): Components {
    const heading = (level: number) =>
        function NoteHeading({ node, children }: { node?: { position?: { start: { line: number } } }; children?: ReactNode }) {
            const Tag = `h${Math.min(6, Math.max(2, level - shift))}` as "h2";
            return (
                <Tag id={node?.position ? headingId(cell, node.position.start.line) : undefined} className="scroll-mt-[calc(var(--nav-h)+1.5rem)]">
                    {children}
                </Tag>
            );
        };
    return { h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6) };
}

const MarkdownCell = memo(({ source, index, shift }: { source: string; index: number; shift: number }) => {
    const components = useMemo(() => headingComponents(index, shift), [index, shift]);
    return (
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} urlTransform={urlTransform} components={components}>
            {source}
        </ReactMarkdown>
    );
});

const OutputView = ({ output }: { output: Output }) => {
    if (output.kind === "image") return <img src={output.src} alt="" loading="lazy" className="!my-0 max-w-full rounded-lg bg-white" />;
    if (output.kind === "html") return <div className="note-html-output overflow-x-auto text-sm" dangerouslySetInnerHTML={{ __html: output.html }} />;
    return (
        <pre className={`!my-0 max-h-96 overflow-auto !bg-transparent !p-0 text-[0.8rem] leading-relaxed ${output.error ? "text-red-300/90" : "text-white/65"}`}>
            {output.text}
        </pre>
    );
};

const CodeCell = memo(({ source, outputs, language }: { source: string; outputs: Output[]; language: string }) => {
    const highlighted = useMemo(
        () => (hljs.getLanguage(language) ? hljs.highlight(source, { language }).value : hljs.highlightAuto(source).value),
        [source, language]
    );
    if (!source.trim() && outputs.length === 0) return null;
    return (
        <div className="not-prose my-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {source.trim() && (
                <pre className="note-code overflow-x-auto px-5 py-4 text-[0.82rem] leading-relaxed text-white/85">
                    <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
            )}
            {outputs.length > 0 && (
                <div className={`space-y-3 px-5 py-4 ${source.trim() ? "border-t border-white/[0.07] bg-black/30" : ""}`}>
                    {outputs.map((output, i) => (
                        <OutputView key={i} output={output} />
                    ))}
                </div>
            )}
        </div>
    );
});

// Highlights the section being read: the last heading above the upper third of the screen
function useActiveHeading(headings: Heading[]) {
    const [active, setActive] = useState<string>();
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            let current: string | undefined;
            for (const heading of headings) {
                const element = document.getElementById(heading.id);
                if (element && element.getBoundingClientRect().top < window.innerHeight / 3) current = heading.id;
            }
            setActive(current);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(frame);
        };
    }, [headings]);
    return active;
}

const Contents = ({ headings, active, top, ...props }: { headings: Heading[]; active?: string; top: number } & ComponentProps<"nav">) => (
    <nav aria-label="Contents" {...props}>
        <ul className="space-y-1 text-sm">
            {headings.map((heading) => (
                <li key={heading.id} style={{ paddingLeft: (heading.level - top) * 14 }}>
                    <a
                        href={`#${heading.id}`}
                        className={`block rounded-md py-1 leading-snug transition-colors ${active === heading.id ? "text-white" : "text-white/45 hover:text-white/80"}`}
                    >
                        <InlineMarkdown>{heading.text}</InlineMarkdown>
                    </a>
                </li>
            ))}
        </ul>
    </nav>
);

const NotePage = () => {
    const { slug = "" } = useParams();
    const entry = notebooks[slug];
    const place = placeOnTrail(slug);
    const [state, setState] = useState<{ slug: string; raw: string; notebook: Notebook } | { slug: string; failed: true } | null>(null);

    useEffect(() => {
        if (!entry) return;
        let cancelled = false;
        entry
            .load()
            .then((raw) => !cancelled && setState({ slug, raw, notebook: parseNotebook(raw) }))
            .catch(() => !cancelled && setState({ slug, failed: true }));
        return () => {
            cancelled = true;
        };
    }, [entry, slug]);

    const title = place?.title ?? slug.replace(/-/g, " ");
    useEffect(() => {
        const previous = document.title;
        document.title = `${title} · Notes`;
        return () => {
            document.title = previous;
        };
    }, [title]);

    const loaded = state?.slug === slug && "notebook" in state ? state : null;
    const headings = useMemo(() => (loaded ? findHeadings(loaded.notebook.cells) : []), [loaded]);
    const topLevel = Math.min(...headings.map((h) => h.level), 6);
    // Only the top two levels go in the contents, so it stays a short overview
    const contents = useMemo(() => headings.filter((h) => h.level <= topLevel + 1), [headings, topLevel]);
    const active = useActiveHeading(contents);

    const downloadUrl = useMemo(() => (loaded ? URL.createObjectURL(new Blob([loaded.raw], { type: "application/x-ipynb+json" })) : undefined), [loaded]);
    useEffect(() => () => downloadUrl && URL.revokeObjectURL(downloadUrl), [downloadUrl]);

    const missing = !entry || (state?.slug === slug && "failed" in state);
    const color = place ? chapterColors[place.color] : null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto flex max-w-6xl gap-12 px-5 pb-24 pt-12 md:px-8">
                <main className="min-w-0 max-w-3xl flex-1">
                    <Link to="/trail" className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white/80">
                        <ArrowLeft className="h-4 w-4" />
                        The Trail
                    </Link>

                    {missing ? (
                        <div className="mt-10">
                            <h1 className="text-3xl font-semibold text-white">No notes here</h1>
                            <p className="mt-3 text-white/55">These notes don't exist, or couldn't be loaded.</p>
                        </div>
                    ) : (
                        <>
                            <header className="mt-8 border-b border-white/10 pb-8">
                                {place?.chapter && (
                                    <p className="flex items-center gap-2 text-sm text-white/50">
                                        <span className={`h-2 w-2 rounded-full ${color?.dot}`} />
                                        {place.chapter}
                                    </p>
                                )}
                                <h1 className="mt-2 flex items-center gap-3 text-4xl font-semibold capitalize tracking-tight text-white md:text-5xl">
                                    {!place?.chapter && color && <span className={`h-3 w-3 shrink-0 rounded-full ${color.dot}`} />}
                                    {title}
                                </h1>
                                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                                    <a
                                        href={downloadUrl}
                                        download={entry.file.split("/").pop()}
                                        aria-disabled={!downloadUrl}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-white/75 transition-colors hover:border-white/30 hover:text-white"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download .ipynb
                                    </a>
                                    <a
                                        href={colabUrl(entry.file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-white/75 transition-colors hover:border-white/30 hover:text-white"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Open in Colab
                                    </a>
                                </div>
                            </header>

                            {loaded ? (
                                <>
                                    {contents.length > 2 && (
                                        <details className="mt-8 rounded-2xl border border-white/10 px-5 py-3 xl:hidden">
                                            <summary className="cursor-pointer text-sm font-medium text-white/70">Contents</summary>
                                            <Contents headings={contents} active={active} top={topLevel} className="mt-3 pb-2" />
                                        </details>
                                    )}
                                    <article className="note-body prose prose-invert mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-white/80 prose-li:text-white/80 prose-img:mx-auto prose-img:rounded-xl animate-in fade-in-0 duration-500">
                                        {loaded.notebook.cells.map((cell, index) =>
                                            cell.kind === "markdown" ? (
                                                <MarkdownCell key={index} source={cell.source} index={index} shift={topLevel - 2} />
                                            ) : (
                                                <CodeCell key={index} source={cell.source} outputs={cell.outputs} language={loaded.notebook.language} />
                                            )
                                        )}
                                    </article>
                                </>
                            ) : (
                                <div className="mt-10 space-y-4" aria-label="Loading notes">
                                    {[92, 100, 80, 96, 60].map((width, i) => (
                                        <div key={i} className="h-4 animate-pulse rounded bg-white/[0.06]" style={{ width: `${width}%` }} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>

                {loaded && contents.length > 2 && (
                    <aside className="hidden w-60 shrink-0 xl:block">
                        <div className="sticky top-[calc(var(--nav-h)+3rem)] max-h-[calc(100vh-var(--nav-h)-4rem)] overflow-y-auto pb-8">
                            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/35">Contents</p>
                            <Contents headings={contents} active={active} top={topLevel} />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default NotePage;
