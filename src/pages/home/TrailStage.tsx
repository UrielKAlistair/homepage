import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { navHeight, stageInset } from "@/lib/layout";
import { rewindMs } from "@/lib/playback";
import TrailMap from "../Trail/TrailMap";
import type { TrailMapHandle } from "../Trail/TrailMap";
import type { Size } from "../Trail/TrailLayout";

// The trail map in the home page's first panel, and the same map grown to fill the screen.
// One map, never remounted: in the panel it's a picture (drawing itself in while the panel is on
// screen); entering, it grows to full size and its camera pulls back to the whole trail; leaving,
// the camera returns to the panel's view and the map shrinks back into the panel.
// The map is always laid out at its real size, panel or full, and its camera does the framing:
// React Flow measures node handles on screen, so a CSS scale on the map would misplace every
// arrow. Growing and shrinking switch to full size at once and animate a transform from the
// panel's place, during which nothing is measured.
//
// Phases: panel -> growing -> full -> shrinking -> panel. `expanded` (from the URL) drives them.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const growMs = reduceMotion ? 0 : 650;
const growEasing = "cubic-bezier(0.45, 0, 0.25, 1)";
const zoomOutMs = reduceMotion ? 0 : 1100; // after growing, from the panel's view to the whole trail
const radius = 24; // px, the map's rounded corners at full size

type TrailStageProps = {
    canvas: Size; // the map's drawing area at full size (inside its 1px border)
    expanded: boolean;
    active: boolean; // the panel is on screen
    complete: boolean; // the intro has already been seen
    onEnter: () => void;
    onExit: () => void;
    onFinished: () => void; // the intro is over
    slotClassName?: string;
};

type Phase = "panel" | "growing" | "full" | "shrinking";

const TrailStage = ({ canvas, expanded, active, complete, onEnter, onExit, onFinished, slotClassName = "" }: TrailStageProps) => {
    const slotRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<TrailMapHandle>(null);
    const [phase, setPhase] = useState<Phase>(expanded ? "full" : "panel");
    const [introDone, setIntroDone] = useState(complete || expanded || reduceMotion);
    const from = useRef<{ dx: number; dy: number; scale: number } | null>(null);

    const width = canvas.width + 2;
    const height = canvas.height + 2;
    const onFinishedRef = useRef(onFinished);
    onFinishedRef.current = onFinished;

    const finishIntro = () => {
        if (introDone) return;
        setIntroDone(true);
        onFinishedRef.current();
    };

    // Where the panel is, relative to the full-size map's place: the transform that puts the map there
    const panelTransform = () => {
        const slot = slotRef.current!.getBoundingClientRect();
        return { dx: slot.left - stageInset(), dy: slot.top - (navHeight() + stageInset()), scale: slot.width / width };
    };

    // The URL says which view; the phases carry the map between them
    useEffect(() => {
        if (expanded && phase === "panel") {
            finishIntro();
            from.current = panelTransform();
            setPhase("growing");
        } else if (!expanded && phase === "full") {
            from.current = panelTransform();
            setPhase("shrinking");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded, phase]);

    // Growing and shrinking: one transform between the panel's place and the full size. The
    // camera is set for the map's new size before the frame is drawn, so nothing jumps.
    useLayoutEffect(() => {
        const stage = stageRef.current;
        const start = from.current;
        if (phase === "growing" || phase === "panel") void mapRef.current?.showPreview(0);
        if (!stage || !start || (phase !== "growing" && phase !== "shrinking")) return;
        const inPanel = { transform: `translate(${start.dx}px, ${start.dy}px) scale(${start.scale})`, borderRadius: `${radius / start.scale}px` };
        const atFull = { transform: "none", borderRadius: `${radius}px` };
        const growing = phase === "growing";
        if (!growing) void mapRef.current?.showPreview(growMs);
        const animation = stage.animate(growing ? [inPanel, atFull] : [atFull, inPanel], { duration: growMs, easing: growEasing, fill: "forwards" });
        animation.finished
            .then(() => {
                setPhase(growing ? "full" : "panel");
                if (growing) void mapRef.current?.showWhole(zoomOutMs);
            })
            .catch(() => {});
        return () => animation.cancel();
    }, [phase]);

    // The intro plays only while the panel is on screen; coming back to it steps back a little
    const playing = active && phase === "panel" && !introDone;
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage || introDone) return;
        if (playing) {
            for (const animation of stage.getAnimations({ subtree: true })) {
                if (!(animation instanceof CSSAnimation) || !animation.animationName.startsWith("ti-")) continue;
                const end = animation.effect?.getComputedTiming().endTime;
                const time = animation.currentTime;
                if (typeof time === "number" && typeof end === "number" && time > 0 && time < end) animation.currentTime = Math.max(0, time - rewindMs);
            }
        }
    }, [playing, introDone]);

    // The intro is over when its clock runs out
    useEffect(() => {
        const clock = stageRef.current?.querySelector(".ti-clock");
        const animation = clock?.getAnimations()[0];
        if (introDone || !animation) return;
        let cancelled = false;
        animation.finished.then(() => !cancelled && finishIntro()).catch(() => {});
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [introDone]);

    const atFullSize = phase !== "panel";
    return (
        <div ref={slotRef} className={`group relative ${slotClassName}`} style={{ aspectRatio: `${width} / ${height}` }}>
            {/* Covers the home page while the map is full size */}
            <div
                className={`fixed inset-0 z-30 bg-night transition-opacity ease-in-out ${phase === "growing" || phase === "full" ? "opacity-100" : "pointer-events-none opacity-0"}`}
                style={{ transitionDuration: `${growMs}ms` }}
                aria-hidden="true"
            />
            <div
                ref={stageRef}
                className={`overflow-hidden border border-white/10 bg-night-panel transition-colors group-hover:border-white/25 ${introDone ? "" : "trail-intro"} ${playing ? "playing" : ""}`}
                style={{
                    transformOrigin: "0 0",
                    borderRadius: radius,
                    ...(atFullSize
                        ? { position: "fixed", left: stageInset(), top: navHeight() + stageInset(), width, height, zIndex: 40 }
                        : { position: "absolute", inset: 0 }),
                }}
            >
                <ReactFlowProvider>
                    <TrailMap ref={mapRef} view={phase === "panel" || phase === "full" ? phase : "moving"} aspectRatio={canvas.width / canvas.height} intro={!introDone} onExit={onExit} />
                </ReactFlowProvider>
            </div>
            {phase === "panel" && <button type="button" onClick={onEnter} aria-label="Enter the trail" className="absolute inset-0 rounded-3xl" />}
        </div>
    );
};

export default TrailStage;
