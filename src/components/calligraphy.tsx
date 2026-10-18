import { useEffect, useRef } from 'react';
import { createTimeline, svg, type Timeline } from "animejs";
import { rewindMs } from "@/lib/playback";

// Writes out an SVG of outlined script letters (see scripts/text-to-calligraphy-svg.mjs): each
// letter's outline is traced, then filled. The SVGs list letters right to left, so the last
// path is drawn first and the word is written left to right.
// The writing runs only while `active`; pausing and resuming steps back by rewindMs.

const startDelay = 200;
const letterStagger = 40;
const traceMs = 1000;
const fillMs = 1000;

type CalligraphyProps = {
    src: string;
    active?: boolean;
    complete?: boolean; // already written this visit: show it finished
    onFinished?: () => void;
    className?: string;
};

function Calligraphy({ src, active = true, complete = false, onFinished, className = "" }: CalligraphyProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const timeline = useRef<Timeline | null>(null);
    const activeRef = useRef(active);
    activeRef.current = active;
    const onFinishedRef = useRef(onFinished);
    onFinishedRef.current = onFinished;
    const started = active || complete || timeline.current !== null;

    // Built once, the first time the panel is reached
    useEffect(() => {
        if (!started || timeline.current) return;
        let cancelled = false;
        fetch(src)
            .then((res) => res.text())
            .then((svgText) => {
                const container = containerRef.current;
                if (cancelled || !container) return;
                container.innerHTML = svgText;
                const svgEl = container.querySelector("svg");
                if (svgEl) {
                    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
                    svgEl.style.display = "block";
                    svgEl.style.width = "100%";
                    svgEl.style.height = "100%";
                }
                const paths = Array.from(container.querySelectorAll("path"));
                const tl = createTimeline({ autoplay: false, onComplete: () => onFinishedRef.current?.() });
                paths.forEach((path, index) => {
                    path.setAttribute("stroke", "currentColor");
                    path.setAttribute("fill-opacity", "0");
                    path.setAttribute("stroke-width", "0.8");
                    const at = startDelay + letterStagger * (paths.length - 1 - index);
                    tl.add(svg.createDrawable(path), { draw: ["0 0", "0 1"], duration: traceMs, ease: "inOutQuad" }, at);
                    tl.add(path, { fillOpacity: [0, 1], duration: fillMs, ease: "inOutQuad" }, at + traceMs);
                });
                timeline.current = tl;
                if (complete) tl.seek(tl.duration, true);
                else {
                    tl.seek(0);
                    if (activeRef.current) tl.play();
                }
            });
        return () => {
            cancelled = true;
        };
    }, [src, started, complete]);

    useEffect(() => {
        const tl = timeline.current;
        if (!tl || tl.completed) return;
        if (active) tl.seek(Math.max(0, tl.currentTime - rewindMs)).play();
        else tl.pause();
    }, [active]);

    useEffect(() => {
        const current = timeline;
        return () => {
            current.current?.pause();
        };
    }, []);

    return <div ref={containerRef} className={className} />;
}

export default Calligraphy;
