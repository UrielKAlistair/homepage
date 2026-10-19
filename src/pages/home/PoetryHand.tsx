import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { poems } from "../poems";

// The poem cards arrive as a face-down deck, then are dealt one by one into a fanned hand,
// turning face up in the air. Hovering lifts a card, as in the Poetry view's tray. Clicking
// opens the Poetry view (see PoetryStage, which flies the cards there and back).
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

type PoetryHandProps = {
    active: boolean;
    cardWidth: number;
    complete?: boolean; // already dealt this visit: show the hand without dealing
    onFinished?: () => void;
    onEnter: () => void;
    away?: boolean; // the cards are flying (their copies are): hide them
};

export type PoetryHandHandle = { cards: () => HTMLElement[] };

const PoetryHand = forwardRef<PoetryHandHandle, PoetryHandProps>(({ active, cardWidth, complete = false, onFinished, onEnter, away = false }, ref) => {
    const skip = reduceMotion || complete;
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
    const animations = useRef<Animation[]>([]);
    const [started, setStarted] = useState(skip);
    const [dealt, setDealt] = useState(skip);
    const [hovered, setHovered] = useState<number | null>(null);
    const hoveredRef = useRef<number | null>(null);
    hoveredRef.current = hovered;
    const n = poems.length;
    useImperativeHandle(ref, () => ({ cards: () => cardRefs.current.filter((card): card is HTMLButtonElement => card !== null) }), []);

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

    return (
        <div className="relative" style={{ width: cardWidth, height: cardWidth * 1.4, opacity: away ? 0 : undefined }}>
            {poems.map((poem, i) => (
                <button
                    key={poem.title}
                    ref={(node) => (cardRefs.current[i] = node)}
                    type="button"
                    aria-label={`Read ${poem.title}`}
                    onClick={onEnter}
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
                    }}
                >
                    {/* Picked up the same way as in the Poetry view (.poem-card in index.css) */}
                    <div
                        data-lifted={hovered === i ? "" : undefined}
                        className="poem-card h-full w-full rounded-2xl border border-white/20 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] [perspective:900px]"
                    >
                        <div ref={(node) => (faceRefs.current[i] = node)} className="relative h-full w-full [transform-style:preserve-3d]">
                            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white [backface-visibility:hidden]">
                                <img src={poem.cardImage} alt="" className="poem-card-art h-full w-full object-contain" draggable={false} />
                                <div className="poem-card-shade pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                            </div>
                            {/* The back: the ❖ that marks a poem loading in the Poetry view */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#14224a] to-[#070d1f] text-3xl text-sky-200/60 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <div className="absolute inset-2 rounded-xl border border-sky-200/15" />❖
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
});

export default PoetryHand;
