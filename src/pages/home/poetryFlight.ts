import { poems } from "../poems";

// The poem cards' flights between the home page's hand and the Poetry view's tray. Copies of the
// cards fly, on a layer of their own above the page, since the tray scrolls and clips its cards.
// Entering: in one tossing motion the fan closes into a deck that flies along a parabola to the
// tray's first slot, and the cards are dealt down into their slots. Leaving: each card drifts
// straight back to its place in the fan, one after another.

const n = poems.length;
const tossMs = 1500; // from the hand to the tray's first slot, starting and ending at rest
const dealSlideMs = 520; // one card sliding from the deck down to its slot
const dealGapMs = 220; // between one card leaving the deck and the next
const tossArc = 0.12; // of the screen height: how far the flight bows above the straight line to the slot
const joinShare = 0.4; // of its way along, by when a card has closed onto the deck's path, its tilt gone
const lagShare = 0.08; // of the way, each card's lag behind the one ahead at the start, closing to nothing at the slot
const sampleMs = 20; // between keyframes
const returnMs = 850;
const returnStagger = 70;
const returnEasing = "cubic-bezier(0.45, 0, 0.25, 1)";
const cardAspect = 1.4; // height over width, in the hand and in the tray

const enterMs = tossMs + (n - 2) * dealGapMs + dealSlideMs;

// A card on screen: its centre (viewport px), its tilt (radians, clockwise) and its width
export type Pose = { x: number; y: number; angle: number; width: number };

const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Where a card element is drawn: its box, moved by its `translate` and then its transform, both
// about its transform origin
export function poseOf(card: HTMLElement): Pose {
    const parent = (card.offsetParent as HTMLElement).getBoundingClientRect();
    const style = getComputedStyle(card);
    const [originX, originY] = style.transformOrigin.split(" ").map(parseFloat);
    const [shiftX = 0, shiftY = 0] = style.translate === "none" ? [] : style.translate.split(" ").map(parseFloat);
    const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
    const centre = matrix.transformPoint(new DOMPoint(card.offsetWidth / 2 - originX, card.offsetHeight / 2 - originY));
    return {
        x: parent.left + card.offsetLeft + originX + shiftX + centre.x,
        y: parent.top + card.offsetTop + originY + shiftY + centre.y,
        angle: Math.atan2(matrix.b, matrix.a),
        width: card.offsetWidth * Math.hypot(matrix.a, matrix.b),
    };
}

// The copies are drawn at the larger of the two card sizes and scaled to each pose
function sizeCopies(copies: HTMLElement[], hand: Pose[], tray: Pose[]) {
    const width = Math.max(...hand.map((pose) => pose.width), ...tray.map((pose) => pose.width));
    for (const copy of copies) {
        copy.style.width = `${width}px`;
        copy.style.height = `${width * cardAspect}px`;
    }
    return width;
}

const placed = (pose: Pose, width: number) =>
    `translate(${(pose.x - width / 2).toFixed(1)}px, ${(pose.y - (width * cardAspect) / 2).toFixed(1)}px) rotate(${pose.angle.toFixed(4)}rad) scale(${(pose.width / width).toFixed(4)})`;

// The deck's path is a parabola from the hand's centre to the first slot, bowing up by tossArc,
// walked once from rest to rest. Rain leads and each card starts a beat behind the one before;
// a card closes onto the path over the first joinShare of its way, straightening from its tilt
// in the fan, and the beats shrink so all four land together as a deck. Then each slides down
// out of the deck into its own slot.
export function flyIn(copies: HTMLElement[], hand: Pose[], tray: Pose[]): Animation[] {
    const width = sizeCopies(copies, hand, tray);
    const tall = window.innerHeight;
    const centre = { x: hand.reduce((sum, p) => sum + p.x, 0) / n, y: hand.reduce((sum, p) => sum + p.y, 0) / n };
    const deck = tray[0];
    const steps = Math.ceil(enterMs / sampleMs);

    return copies.map((copy, i) => {
        const start = hand[i];
        const poseAt = (t: number): Pose => {
            if (t <= tossMs) {
                const lead = easeInOutSine(t / tossMs);
                const s = Math.max(0, lead - lagShare * i * (1 - lead));
                const joined = smoothstep(clamp01(s / joinShare));
                return {
                    x: mix(centre.x, deck.x, s) + (start.x - centre.x) * (1 - joined),
                    y: mix(centre.y, deck.y, s) - 4 * tossArc * tall * s * (1 - s) + (start.y - centre.y) * (1 - joined),
                    angle: start.angle * (1 - joined),
                    width: mix(start.width, deck.width, s),
                };
            }
            if (i === 0) return deck;
            const slide = easeInOutSine(clamp01((t - tossMs - (i - 1) * dealGapMs) / dealSlideMs));
            const to = tray[i];
            return { x: mix(deck.x, to.x, slide), y: mix(deck.y, to.y, slide), angle: 0, width: mix(deck.width, to.width, slide) };
        };
        // Rain on top of the deck, each card under the one before
        copy.style.zIndex = String(n - i);
        const keyframes = Array.from({ length: steps + 1 }, (_, k) => ({ transform: placed(poseAt((k / steps) * enterMs), width) }));
        return copy.animate(keyframes, { duration: enterMs, easing: "linear", fill: "both" });
    });
}

export function flyBack(copies: HTMLElement[], tray: Pose[], hand: Pose[]): Animation[] {
    const width = sizeCopies(copies, hand, tray);
    return copies.map((copy, i) => {
        // As in the fan, each card over the one before
        copy.style.zIndex = String(i + 1);
        return copy.animate([{ transform: placed(tray[i], width) }, { transform: placed(hand[i], width) }], {
            duration: returnMs,
            delay: i * returnStagger,
            easing: returnEasing,
            fill: "both",
        });
    });
}
