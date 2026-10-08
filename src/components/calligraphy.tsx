import { useEffect, useRef, useState } from 'react';
import { svg, animate, type JSAnimation } from "animejs";

type HeroTextProps = {
    className?: string;
};

// Below md the single line is too small to read, so use the two-line version (scripts/stack-header-svg.py)
const STACKED_QUERY = "(max-width: 767px)";

function useStacked() {
    const [stacked, setStacked] = useState(() => window.matchMedia(STACKED_QUERY).matches);

    useEffect(() => {
        const query = window.matchMedia(STACKED_QUERY);
        const onChange = () => setStacked(query.matches);
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, []);

    return stacked;
}

function HeroText({ className = "" }: HeroTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stacked = useStacked();

    useEffect(() => {
        let isMounted = true;
        const animations: JSAnimation[] = [];

        fetch(stacked ? "/header-stacked.svg" : "/header.svg")
            .then((res) => res.text())
            .then((svgText) => {
                if (!isMounted || !containerRef.current) return;

                containerRef.current.innerHTML = svgText;

                const paths = Array.from(containerRef.current.querySelectorAll("path"));

                const svgEl = containerRef.current.querySelector("svg");
                if (svgEl) {
                    // Make SVG responsive
                    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
                    svgEl.style.display = "block";
                    svgEl.style.width = "100%";
                    svgEl.style.height = "100%";
                    svgEl.style.maxWidth = "100%";
                    svgEl.style.maxHeight = "100%";
                }

                // Ensure strokes are styled for drawing
                paths.forEach((path) => {
                    path.setAttribute("stroke", "currentColor");
                    path.setAttribute("fill-opacity", "0");
                    path.setAttribute("stroke-width", "0.8");
                });

                // Animate each path
                paths.forEach((path, index) => {
                    const drawable = svg.createDrawable(path);
                    animations.push(animate(drawable, {
                        draw: ["0 0", "0 1"],
                        duration: 1000,
                        easing: "easeInOutQuad",
                        delay: 2800 - 40 * index,
                        onComplete: () => {
                            animations.push(animate(path, {
                                fillOpacity: [0, 1],
                                duration: 1000,
                                easing: "easeInOutQuad",
                            }));
                        }
                    }));
                });
            });

        return () => {
            isMounted = false;
            animations.forEach((animation) => animation.pause());
        };
    }, [stacked]);

    return (
        <div
            ref={containerRef}
            className={`mx-auto ${stacked ? "w-[min(88vw,32rem)] aspect-[590/225]" : "w-[75vw] aspect-[11/1]"} ${className}`}
        />
    );
}

export default HeroText
