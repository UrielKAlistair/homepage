import { useEffect, useRef, useState } from "react";
import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { rewindMs } from "@/lib/playback";
import { poemCardTransition, poems } from "../poems";

// The poem cards arrive as a face-down deck, then are dealt one by one into a fanned hand,
// turning face up in the air. Hovering lifts a card, as on the Poetry page's tray. Clicking
// opens the Poetry page: the cards gather into a deck near the left edge, sweep up and over to
// the tray's first slot, and are dealt down into their slots.
// The deal runs only while `active`; coming back to an unfinished deal rewinds it a little.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const deckMs = 500; // the deck rising into place
const dealStart = 650;
const dealStagger = 170;
const dealMs = 780;
const liftShare = 0.2; // a hovered card rises by this fraction of its width
const hoverMargin = 14; // px around a lifted card that still counts as on it
const hoverGraceMs = 150;
const gatherMs = 820; // the cards gliding left and gathering, starting from rest
const sweepMs = 1250; // the gathered cards sweeping up and over to the tray's first slot
const loopMs = gatherMs + sweepMs;
const dealSlideMs = 520; // one card sliding from the deck down to its slot
const dealGapMs = 220; // between one card leaving the deck and the next
const flightMs = loopMs + (poems.length - 2) * dealGapMs + dealSlideMs;
const gatherInset = 0.07; // of the screen width, from its left edge to the gathered deck's left edge
const gatherRise = 0.08; // of the screen height, from the leftmost card up to where the deck gathers
const trailPx = 18; // each card's distance behind the one ahead as they gather, closing to nothing
const flightSampleMs = 20; // between keyframes

type Point = { x: number; y: number };

// Easings: slow in and out, and slow in only
const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const easeInSine = (t: number) => 1 - Math.cos((Math.PI * t) / 2);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// A curve sampled densely enough to be walked by distance
type Curve = { points: Point[]; lengths: number[]; total: number };
function traced(at: (u: number) => Point, steps = 240): Curve {
    const points = Array.from({ length: steps + 1 }, (_, k) => at(k / steps));
    const lengths = [0];
    for (let k = 1; k <= steps; k++) lengths.push(lengths[k - 1] + Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y));
    return { points, lengths, total: lengths[steps] };
}
function pointAtDistance({ points, lengths, total }: Curve, distance: number): Point {
    const d = Math.min(total, Math.max(0, distance));
    let k = 1;
    while (k < lengths.length - 1 && lengths[k] < d) k++;
    const f = (d - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1);
    return { x: points[k - 1].x + (points[k].x - points[k - 1].x) * f, y: points[k - 1].y + (points[k].y - points[k - 1].y) * f };
}

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

// Where the browser's own animation puts a card's centre at each of these times (ms), read back
// from it: the card also turns and resizes on the way, so its centre isn't simply interpolated
function browserPath(name: string, times: number[]): Point[] {
    const pseudo = `::view-transition-group(${name})`;
    const own = document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement === pseudo);
    own.forEach((animation) => animation.pause());
    const path = times.map((time) => {
        own.forEach((animation) => (animation.currentTime = time));
        const style = getComputedStyle(document.documentElement, pseudo);
        const [originX, originY] = style.transformOrigin.split(" ").map(parseFloat);
        const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
        const turned = matrix.transformPoint(new DOMPoint(parseFloat(style.width) / 2 - originX, parseFloat(style.height) / 2 - originY));
        return { x: originX + turned.x, y: originY + turned.y };
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

    // Built the first time the panel is reached; afterwards only paused, rewound and resumed
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
        for (const animation of animations.current) {
            if (animation.playState === "finished") continue;
            if (active) {
                if (animation.playState === "paused" && typeof animation.currentTime === "number") {
                    animation.currentTime = Math.max(0, animation.currentTime - rewindMs);
                }
                animation.play();
            } else animation.pause();
        }
    }, [active]);

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

    // All four cards glide left, rising a little, to one spot near the screen's left edge,
    // the ones further right moving faster so they arrive almost together, just behind the
    // leftmost card (Rain). From there they sweep up and right along a quarter ellipse to the
    // tray's first slot, the small gaps between them closing, so they arrive as one deck; then
    // each slides down out of the deck into its own slot.
    // The browser moves each card from hand to slot by itself, at an even pace (see flightStyle);
    // adding, at every moment, the gap between where it puts the card and this path makes the
    // card follow the path.
    const flyToTray = () => {
        const width = window.innerWidth;
        const tall = window.innerHeight;
        const names = poems.map(poemCardTransition);
        const steps = Math.ceil(flightMs / flightSampleMs);
        const times = Array.from({ length: steps + 1 }, (_, k) => (k / steps) * flightMs);
        const straight = names.map((name) => browserPath(name, times));
        const starts = straight.map((path) => path[0]);
        const ends = straight.map((path) => path[steps]);
        const deck = ends[0];
        const gather = { x: gatherInset * width + cardWidth / 2, y: starts[0].y - gatherRise * tall };

        // Leftward, curving up to meet the ellipse heading straight up
        const approaches = starts.map((from) =>
            traced((u) => {
                const bend = { x: gather.x, y: from.y };
                return {
                    x: (1 - u) ** 2 * from.x + 2 * u * (1 - u) * bend.x + u * u * gather.x,
                    y: (1 - u) ** 2 * from.y + 2 * u * (1 - u) * bend.y + u * u * gather.y,
                };
            })
        );
        // A quarter ellipse centred below the slot: up from the gathering spot, over, and level into the slot
        const across = deck.x - gather.x;
        const up = gather.y - deck.y;
        const sweep = traced((u) => {
            const angle = Math.PI - (u * Math.PI) / 2;
            return { x: deck.x + across * Math.cos(angle), y: gather.y - up * Math.sin(angle) };
        });

        // How far along the way Rain is. It gathers speed from rest on the way left, keeps that
        // speed into the sweep, picks up more, and slows to a stop at the slot: a cubic in time
        // with the arrival speed at the start and none at the end (kept from running backwards).
        const gatherLength = approaches[0].total;
        const arrivalSpeed = (gatherLength * Math.PI) / (2 * gatherMs); // px/ms, at the end of easeInSine
        const carried = Math.min(arrivalSpeed * sweepMs, 3 * sweep.total);
        const leadDistance = (t: number) => {
            if (t <= gatherMs) return gatherLength * easeInSine(t / gatherMs);
            const u = clamp01((t - gatherMs) / sweepMs);
            return gatherLength + carried * (u ** 3 - 2 * u ** 2 + u) + sweep.total * (3 * u ** 2 - 2 * u ** 3);
        };

        poems.forEach((_, i) => {
            const to = ends[i];
            const approach = approaches[i];
            const positionAt = (t: number): Point => {
                if (t <= loopMs) {
                    // Rain's progress, plus the extra way this card has to come (made up by the
                    // time Rain gathers), less its small gap behind
                    const distance =
                        leadDistance(t) + (approach.total - approaches[0].total) * smoothstep(clamp01(t / gatherMs)) - trailPx * i * (1 - t / loopMs);
                    return distance <= approach.total ? pointAtDistance(approach, distance) : pointAtDistance(sweep, distance - approach.total);
                }
                if (i === 0) return deck;
                const slide = easeInOutSine(clamp01((t - loopMs - (i - 1) * dealGapMs) / dealSlideMs));
                return { x: deck.x + (to.x - deck.x) * slide, y: deck.y + (to.y - deck.y) * slide };
            };
            const keyframes = times.map((time, k) => {
                const point = positionAt(time);
                const dx = point.x - straight[i][k].x;
                const dy = point.y - straight[i][k].y;
                // Rain on top of the deck, each card under the one before
                return { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, zIndex: poems.length - i };
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
