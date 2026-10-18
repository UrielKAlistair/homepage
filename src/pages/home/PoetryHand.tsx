import { useEffect, useRef, useState } from "react";
import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { poemCardTransition, poems } from "../poems";

// The poem cards arrive as a face-down deck, then are dealt one by one into a fanned hand,
// turning face up in the air. Hovering lifts a card, as on the Poetry page's tray. Clicking
// opens the Poetry page: in one tossing motion the fan closes into a deck that flies along a
// parabola to the tray's first slot, and the cards are dealt down into their slots.
// The deal is all or nothing: leaving the panel before it finishes cancels it, and it starts
// over from the top next time.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const deckMs = 500; // the deck rising into place
const dealStart = 650;
const dealStagger = 170;
const dealMs = 780;
const liftShare = 0.2; // a hovered card rises by this fraction of its width
const hoverMargin = 14; // px around a lifted card that still counts as on it
const hoverGraceMs = 150;
const tossMs = 1500; // from the hand to the tray's first slot, starting and ending at rest
const dealSlideMs = 520; // one card sliding from the deck down to its slot
const dealGapMs = 220; // between one card leaving the deck and the next
const flightMs = tossMs + (poems.length - 2) * dealGapMs + dealSlideMs;
const tossArc = 0.12; // of the screen height: how far the flight bows above the straight line to the slot
const joinShare = 0.4; // of its way along, by when a card has closed onto the deck's path, its tilt gone
const lagShare = 0.08; // of the way, each card's lag behind the one ahead at the start, closing to nothing at the slot
const flightSampleMs = 20; // between keyframes

type Point = { x: number; y: number };

// Slow in and out
const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Where card i sits in the fanned hand, and in the deck before dealing
function fanPose(i: number, n: number, cardWidth: number) {
    const t = i - (n - 1) / 2;
    return `translate(${t * cardWidth * 0.62}px, ${t * t * cardWidth * 0.06}px) rotate(${t * 8}deg)`;
}
const deckPose = (i: number, cardWidth: number) => `translate(${-i * 1.5}px, ${cardWidth * 0.12 - i * 1.5}px) rotate(${(i - 1.5) * 1.2}deg)`;

// Card i's whole journey as one animation: rise with the deck, wait its turn, then be dealt
function dealCard(card: HTMLElement, face: HTMLElement, i: number, n: number, cardWidth: number) {
    const dealAt = dealStart + i * dealStagger;
    const total = dealAt + dealMs;
    const at = (ms: number) => ms / total;
    const t = i - (n - 1) / 2;
    const fan = fanPose(i, n, cardWidth);
    const timing: KeyframeAnimationOptions = { duration: total, easing: "ease-out", fill: "both" };
    // Top of the deck is dealt first, and each dealt card lands on top of the previous one
    const move = card.animate(
        [
            { offset: 0, transform: `translate(0, ${cardWidth * 0.5}px) scale(0.9)`, opacity: 0, zIndex: n - i },
            { offset: at(deckMs), transform: deckPose(i, cardWidth), opacity: 1, zIndex: n - i },
            { offset: at(dealAt), transform: deckPose(i, cardWidth), opacity: 1, zIndex: n - i },
            { offset: at(dealAt + dealMs * 0.45), transform: `translate(${t * cardWidth * 0.35}px, ${-cardWidth * 0.55}px) rotate(${t * 4 - 6}deg) scale(1.08)`, zIndex: 10 + i },
            { offset: at(dealAt + dealMs * 0.8), transform: `${fan} translateY(${-cardWidth * 0.04}px) rotate(2deg)`, zIndex: 10 + i },
            { offset: 1, transform: fan, opacity: 1, zIndex: 10 + i },
        ],
        timing
    );
    // Face down until it leaves the deck, face up by the top of its arc
    const turn = face.animate(
        [
            { offset: 0, transform: "rotateY(180deg)" },
            { offset: at(dealAt + dealMs * 0.1), transform: "rotateY(180deg)" },
            { offset: at(dealAt + dealMs * 0.55), transform: "rotateY(0deg)" },
            { offset: 1, transform: "rotateY(0deg)" },
        ],
        { ...timing, easing: "ease-in-out" }
    );
    return [move, turn];
}

// Where the browser's own animation puts a card at each of these times (ms), read back from it:
// its centre, its tilt (radians, clockwise) and the transform origin it turns about. The card
// also turns and resizes on the way, so its centre isn't simply interpolated.
type Pose = Point & { angle: number; origin: Point };
function browserPath(name: string, times: number[]): Pose[] {
    const pseudo = `::view-transition-group(${name})`;
    const own = document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement === pseudo);
    own.forEach((animation) => animation.pause());
    const path = times.map((time) => {
        own.forEach((animation) => (animation.currentTime = time));
        const style = getComputedStyle(document.documentElement, pseudo);
        const [originX, originY] = style.transformOrigin.split(" ").map(parseFloat);
        const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
        const turned = matrix.transformPoint(new DOMPoint(parseFloat(style.width) / 2 - originX, parseFloat(style.height) / 2 - originY));
        return { x: originX + turned.x, y: originY + turned.y, angle: Math.atan2(matrix.b, matrix.a), origin: { x: originX, y: originY } };
    });
    own.forEach((animation) => {
        animation.currentTime = 0;
        animation.play();
    });
    return path;
}

// The browser's own animations for the flying cards: one even, linear move over the whole flight
const flightStyle = poems
    .map(poemCardTransition)
    .map((name) => `::view-transition-group(${name}), ::view-transition-old(${name}), ::view-transition-new(${name})`)
    .join(", ")
    .concat(` { animation-duration: ${flightMs}ms; animation-delay: 0s; animation-timing-function: linear; }`);

type PoetryHandProps = {
    active: boolean;
    cardWidth: number;
    complete?: boolean; // already dealt this visit: show the hand without dealing
    onFinished?: () => void;
};

const PoetryHand = ({ active, cardWidth, complete = false, onFinished }: PoetryHandProps) => {
    const skip = reduceMotion || complete;
    const navigate = useTransitionNavigate();
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
    const animations = useRef<Animation[]>([]);
    const [started, setStarted] = useState(skip);
    const [dealt, setDealt] = useState(skip);
    const [hovered, setHovered] = useState<number | null>(null);
    const hoveredRef = useRef<number | null>(null);
    hoveredRef.current = hovered;
    const n = poems.length;

    // Built each time the panel is reached until a deal has been seen through
    useEffect(() => {
        if (!active || started) return;
        const built = poems.flatMap((_, i) => {
            const card = cardRefs.current[i];
            const face = faceRefs.current[i];
            return card && face ? dealCard(card, face, i, n, cardWidth) : [];
        });
        animations.current = built;
        setStarted(true);
        Promise.all(built.map((a) => a.finished))
            .then(() => {
                setDealt(true);
                onFinished?.();
            })
            .catch(() => {});
    }, [active, started, n, cardWidth, onFinished]);

    useEffect(() => {
        if (active || dealt || !started) return;
        animations.current.forEach((animation) => animation.cancel());
        animations.current = [];
        setStarted(false);
    }, [active, dealt, started]);

    // Which card is lifted, with some give: a lifted card stays lifted while the cursor is near
    // it (including the strip it rose out of), another card takes over only when the cursor is
    // clearly on it, and leaving the hand lets go after a moment. Without this, a card edge
    // under the cursor flickers between lifted and not.
    useEffect(() => {
        if (!dealt || !active) return;
        let release = 0;
        const letGo = () => {
            if (!release) release = window.setTimeout(() => setHovered(null), hoverGraceMs);
        };
        const hold = () => {
            window.clearTimeout(release);
            release = 0;
        };
        const onMove = (event: PointerEvent) => {
            const current = hoveredRef.current;
            const lifted = current === null ? null : cardRefs.current[current];
            if (lifted) {
                const rect = lifted.getBoundingClientRect();
                const near =
                    event.clientX > rect.left - hoverMargin &&
                    event.clientX < rect.right + hoverMargin &&
                    event.clientY > rect.top - hoverMargin &&
                    event.clientY < rect.bottom + cardWidth * liftShare + hoverMargin;
                if (near) return hold();
            }
            const under = document
                .elementsFromPoint(event.clientX, event.clientY)
                .map((element) => cardRefs.current.indexOf(element.closest("button")))
                .find((index) => index >= 0);
            if (under === undefined) return letGo();
            hold();
            setHovered(under);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.clearTimeout(release);
        };
    }, [dealt, active, cardWidth]);

    // One motion from the hand to the tray's first slot. The deck's path is a parabola from the
    // hand's centre to the slot, bowing up by tossArc, walked once from rest to rest. Rain leads
    // and each card starts a beat behind the one before; a card closes onto the path over the
    // first joinShare of its way, straightening from its tilt in the fan, and the beats shrink so
    // all four land together as a deck. Then each slides down out of the deck into its own slot.
    // The browser moves and turns each card from hand to slot by itself, at an even pace (see
    // flightStyle); adding, at every moment, the gap between where it puts the card and this
    // path (a turn about the card's centre and a shift) makes the card follow the path.
    const flyToTray = () => {
        const tall = window.innerHeight;
        const names = poems.map(poemCardTransition);
        const steps = Math.ceil(flightMs / flightSampleMs);
        const times = Array.from({ length: steps + 1 }, (_, k) => (k / steps) * flightMs);
        const browser = names.map((name) => browserPath(name, times));
        const starts = browser.map((path) => path[0]);
        const hand = { x: starts.reduce((sum, p) => sum + p.x, 0) / n, y: starts.reduce((sum, p) => sum + p.y, 0) / n };
        const deck = browser[0][steps];
        const deckAt = (s: number): Point => ({
            x: hand.x + (deck.x - hand.x) * s,
            y: hand.y + (deck.y - hand.y) * s - 4 * tossArc * tall * s * (1 - s),
        });

        poems.forEach((_, i) => {
            const start = starts[i];
            const to = browser[i][steps];
            // Where the card is and how it's tilted
            const poseAt = (t: number): { point: Point; angle: number } => {
                if (t <= tossMs) {
                    const lead = easeInOutSine(t / tossMs);
                    const s = Math.max(0, lead - lagShare * i * (1 - lead));
                    const joined = smoothstep(clamp01(s / joinShare));
                    const onPath = deckAt(s);
                    return {
                        point: { x: onPath.x + (start.x - hand.x) * (1 - joined), y: onPath.y + (start.y - hand.y) * (1 - joined) },
                        angle: start.angle * (1 - joined),
                    };
                }
                if (i === 0) return { point: deck, angle: 0 };
                const slide = easeInOutSine(clamp01((t - tossMs - (i - 1) * dealGapMs) / dealSlideMs));
                return { point: { x: deck.x + (to.x - deck.x) * slide, y: deck.y + (to.y - deck.y) * slide }, angle: 0 };
            };
            const keyframes = times.map((time, k) => {
                const { point, angle } = poseAt(time);
                const { x, y, angle: browserAngle, origin } = browser[i][k];
                // The extra turn is about the transform origin, so shift the card back to the point
                const turn = angle - browserAngle;
                const cos = Math.cos(turn);
                const sin = Math.sin(turn);
                const dx = point.x - (origin.x + (x - origin.x) * cos - (y - origin.y) * sin);
                const dy = point.y - (origin.y + (x - origin.x) * sin + (y - origin.y) * cos);
                // Rain on top of the deck, each card under the one before
                return { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, rotate: `${turn.toFixed(4)}rad`, zIndex: n - i };
            });
            document.documentElement.animate(keyframes, { duration: flightMs, easing: "linear", pseudoElement: `::view-transition-group(${names[i]})` });
        });
    };

    const openPoetry = () => {
        // Set before the transition starts, so the browser's own animations take this timing
        const style = document.head.appendChild(document.createElement("style"));
        style.textContent = flightStyle;
        const transition = navigate("/poetry", { state: { fromDeck: true }, onAnimate: flyToTray });
        const removeStyle = () => style.remove();
        if (transition) transition.finished.then(removeStyle, removeStyle);
        else removeStyle();
    };

    return (
        <div className="relative" style={{ width: cardWidth, height: cardWidth * 1.4 }}>
            {poems.map((poem, i) => (
                <button
                    key={poem.title}
                    ref={(node) => (cardRefs.current[i] = node)}
                    type="button"
                    aria-label={`Read ${poem.title}`}
                    onClick={openPoetry}
                    onFocus={() => dealt && setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className="absolute inset-0 outline-none focus-visible:[&>div]:ring-2 focus-visible:[&>div]:ring-sky-200"
                    style={{
                        transform: skip ? fanPose(i, n, cardWidth) : undefined,
                        opacity: started ? undefined : 0,
                        transformOrigin: "50% 100%",
                        // Lifting is an individual property, so it adds to the deal's transform
                        translate: hovered === i ? `0 ${-cardWidth * liftShare}px` : "0 0",
                        transition: "translate 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                        zIndex: hovered === i ? 30 : undefined,
                        viewTransitionName: poemCardTransition(poem),
                    }}
                >
                    {/* Picked up the same way as on the Poetry page (.poem-card in index.css) */}
                    <div
                        data-lifted={hovered === i ? "" : undefined}
                        className="poem-card h-full w-full rounded-2xl border border-white/20 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] [perspective:900px]"
                    >
                        <div ref={(node) => (faceRefs.current[i] = node)} className="relative h-full w-full [transform-style:preserve-3d]">
                            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white [backface-visibility:hidden]">
                                <img src={poem.cardImage} alt="" className="poem-card-art h-full w-full object-contain" draggable={false} />
                                <div className="poem-card-shade pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                            </div>
                            {/* The back: the ❖ that marks a poem loading on the Poetry page */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#14224a] to-[#070d1f] text-3xl text-sky-200/60 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <div className="absolute inset-2 rounded-xl border border-sky-200/15" />❖
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default PoetryHand;
