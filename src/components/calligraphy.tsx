import { useEffect, useRef, useState } from 'react';
import { svg, animate } from "animejs";

function HeroText() {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationsRef = useRef<any[]>([]); // To store animation instances

    useEffect(() => {
        let isMounted = true;

        fetch("/header.svg")
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
                const animations = paths.map((path, index) => {
                    const drawable = svg.createDrawable(path);
                    return animate(drawable, {
                        draw: ["0 0", "0 1"],
                        duration: 1000,
                        easing: "easeInOutQuad",
                        delay: 2800 - 40 * index,
                        onComplete: () => {
                            animate(path, {
                                fillOpacity: [0, 1],
                                duration: 1000,
                                easing: "easeInOutQuad",
                            });
                        }
                    });
                });


                animationsRef.current = animations;
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="max-w-[70vw] aspect-[11/1] mx-auto"
        />
    );
}

export default HeroText