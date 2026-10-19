import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { poems } from "../poems";
import PoetryHand from "./PoetryHand";
import type { PoetryHandHandle } from "./PoetryHand";
import PoetryView from "./PoetryView";
import type { PoetryViewHandle } from "./PoetryView";
import { flyBack, flyIn, poseOf } from "./poetryFlight";

// The hand of cards in the home page's poetry panel, and the Poetry view it grows into at
// /poetry, as TrailStage does for the trail. Entering, the cards fly from the hand into the
// view's tray while the view fades in; leaving, by any Back, they fly back into the hand while
// it fades out (see poetryFlight). A change of URL during a flight waits for it to land.
// Leaving when the hand is off screen (a navbar link to another panel) the view just fades.
//
// Phases: panel -> entering -> open -> leaving -> panel. `expanded` (from the URL) drives them.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fadeMs = 600;

type PoetryStageProps = {
    expanded: boolean;
    active: boolean; // the panel is on screen and its heading written
    complete: boolean; // the hand has already been dealt
    cardWidth: number; // in the hand
    onEnter: () => void;
    onExit: () => void;
    onFinished: () => void; // the deal is over
};

type Phase = "panel" | "entering" | "open" | "leaving";

const PoetryStage = ({ expanded, active, complete, cardWidth, onEnter, onExit, onFinished }: PoetryStageProps) => {
    const handRef = useRef<PoetryHandHandle>(null);
    const viewRef = useRef<PoetryViewHandle>(null);
    const copiesRef = useRef<HTMLDivElement>(null);
    const [phase, setPhase] = useState<Phase>(expanded ? "open" : "panel");
    const [flying, setFlying] = useState(false);
    // Opened at /poetry directly, the tray's cards trace themselves in; flown in, they're already there
    const [arrived, setArrived] = useState(false);

    const handOnScreen = () => {
        const cards = handRef.current?.cards() ?? [];
        return cards.some((card) => {
            const box = card.getBoundingClientRect();
            return box.bottom > 0 && box.top < window.innerHeight;
        });
    };

    // The URL says which view; the phases carry the cards between them
    useEffect(() => {
        if (expanded && phase === "panel") {
            setFlying(!reduceMotion && handOnScreen());
            setArrived(true);
            setPhase("entering");
        } else if (!expanded && phase === "open") {
            setFlying(!reduceMotion && handOnScreen());
            setPhase("leaving");
        }
    }, [expanded, phase]);

    // Entering and leaving: the view fades while the copies fly, and the phase ends when all land
    useLayoutEffect(() => {
        if (phase !== "entering" && phase !== "leaving") return;
        const view = viewRef.current!.root();
        const entering = phase === "entering";
        const animations = [view.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduceMotion ? 0 : fadeMs, easing: "ease-in-out", fill: "both", direction: entering ? "normal" : "reverse" })];
        if (flying) {
            const copies = [...copiesRef.current!.children] as HTMLElement[];
            const hand = handRef.current!.cards().map(poseOf);
            const tray = viewRef.current!.trayCards().map(poseOf);
            animations.push(...(entering ? flyIn(copies, hand, tray) : flyBack(copies, tray, hand)));
        }
        Promise.all(animations.map((animation) => animation.finished))
            .then(() => setPhase(entering ? "open" : "panel"))
            .catch(() => {});
        return () => animations.forEach((animation) => animation.cancel());
    }, [phase, flying]);

    const moving = flying && (phase === "entering" || phase === "leaving");
    return (
        <>
            <PoetryHand ref={handRef} active={active} cardWidth={cardWidth} complete={complete} onFinished={onFinished} onEnter={onEnter} away={moving} />
            {phase !== "panel" && <PoetryView ref={viewRef} onExit={onExit} arrived={arrived} cardsHidden={moving} />}
            {moving && (
                <div ref={copiesRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
                    {poems.map((poem) => (
                        <div key={poem.title} className="absolute left-0 top-0 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)]" style={{ transformOrigin: "50% 50%" }}>
                            <img src={poem.cardImage} alt="" className="h-full w-full object-contain" draggable={false} />
                            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default PoetryStage;
