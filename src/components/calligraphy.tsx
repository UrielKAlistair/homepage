import { useEffect, useLayoutEffect, useRef } from "react";
import { createTimeline, svg as anime, type Timeline } from "animejs";
import { rewindMs } from "@/lib/playback";

// Writes out an SVG of outlined script letters (see scripts/text-to-calligraphy-svg.mjs) in two
// waves: the outlines start one after another across the word over sweepMs, whatever its length,
// and each letter fills once its outline is traced. The SVGs list letters in reverse text order,
// so the last path is drawn first and the word is written left to right.
// The markup is bundled, so the word is on the page from the first frame (blank until written).
// The writing runs only while `active`; pausing and resuming steps back by rewindMs.
// onWritten fires halfway through the last letter's fill, when what is left is too faint to hold
// back whatever comes next; onFinished fires at the end.

const startDelay = 200;
const sweepMs = 1200;
const traceMs = 1000;
const fillMs = 1000;

type CalligraphyProps = {
    svg: string; // the SVG's markup
    active?: boolean;
    complete?: boolean; // already written this visit: show it finished
    onWritten?: () => void;
    onFinished?: () => void;
    className?: string;
};

function Calligraphy({ svg, active = true, complete = false, onWritten, onFinished, className = "" }: CalligraphyProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const timeline = useRef<Timeline | null>(null);
    const onWrittenRef = useRef(onWritten);
    onWrittenRef.current = onWritten;
    const onFinishedRef = useRef(onFinished);
    onFinishedRef.current = onFinished;
    const completeAtMount = useRef(complete);
    const activeAtMount = useRef(active);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = svg;
        const svgEl = container.querySelector("svg");
        if (svgEl) {
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            svgEl.style.display = "block";
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
        }
        const paths = Array.from(container.querySelectorAll("path"));
        const letterStagger = sweepMs / Math.max(1, paths.length - 1);
        const tl = createTimeline({ autoplay: false, onComplete: () => onFinishedRef.current?.() });
        paths.forEach((path, index) => {
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("fill-opacity", "0");
            path.setAttribute("stroke-width", "0.8");
            const at = startDelay + letterStagger * (paths.length - 1 - index);
            tl.add(anime.createDrawable(path), { draw: ["0 0", "0 1"], duration: traceMs, ease: "inOutQuad" }, at);
            tl.add(path, { fillOpacity: [0, 1], duration: fillMs, ease: "inOutQuad" }, at + traceMs);
        });
        tl.call(() => onWrittenRef.current?.(), tl.duration - fillMs / 2);
        if (completeAtMount.current) tl.seek(tl.duration, true);
        else {
            tl.seek(0);
            if (activeAtMount.current) tl.play();
        }
        timeline.current = tl;
        return () => {
            tl.pause();
            timeline.current = null;
        };
    }, [svg]);

    useEffect(() => {
        const tl = timeline.current;
        if (!tl || tl.completed) return;
        if (active) tl.seek(Math.max(0, tl.currentTime - rewindMs)).play();
        else tl.pause();
    }, [active]);

    return <div ref={containerRef} className={className} />;
}

export default Calligraphy;
