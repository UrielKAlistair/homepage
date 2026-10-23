import { createContext } from "react";
import type { Rect } from "./TrailLayout";

// The map drawing itself in, on the home page: the hex fabric appears, chapters arrive left to
// right, each territory spawns outward from its chapter cell by cell, then the arrows draw in,
// left to right; arrows pointing back left come last, so the eye ends on the right.
// The page's parts are CSS animations (the ti-* rules in index.css) whose delays, in seconds,
// come from here; the territory canvas reads `elapsed`, the intro's own clock, so it pauses and
// rewinds with them. While the intro runs, this timing is provided through TrailIntroTiming;
// afterwards it's null and nothing animates.

// A territory's cells start `spread` apart from its chapter's edge to the edge of its reach, each
// a little early or late (up to `jitter`), and each grows in over `duration`, overshooting slightly
export const cellSpawn = { spread: 0.35, jitter: 0.08, duration: 0.3, overshoot: 1.70158 };

const chapterStart = 0.35; // the first chapter
const chapterStagger = 0.09;
const topicLag = 0.2; // after its chapter
const topicStagger = 0.06;
const territoryLag = 0.1; // after its chapter
const edgeLag = 0.45; // after the later of its two chapters
const backwardLag = 0.8; // an arrow pointing left: after the last chapter
const edgeDuration = 1.05; // the line draws over 0.7 s; its arrowhead fades in from 0.55 s, over 0.5 s

export type IntroTiming = {
    chapter: (id: string) => number;
    topic: (chapterId: string, index: number) => number;
    territory: (chapterId: string) => number;
    edge: (sourceChapter: string, targetChapter: string) => number;
    labels: number;
    end: number; // when the last animation has finished
    elapsed: () => number; // how much of the intro has played
};

export const TrailIntroTiming = createContext<IntroTiming | null>(null);

export function introTiming(chapters: Map<string, Rect>, elapsed: () => number): IntroTiming {
    const leftToRight = [...chapters.entries()].sort(([, a], [, b]) => a.x - b.x || a.y - b.y).map(([id]) => id);
    const arrival = new Map(leftToRight.map((id, rank) => [id, chapterStart + rank * chapterStagger]));
    const last = Math.max(...arrival.values());
    const centre = (id: string) => chapters.get(id)!.x + chapters.get(id)!.width / 2;
    return {
        chapter: (id) => arrival.get(id)!,
        topic: (chapterId, index) => arrival.get(chapterId)! + topicLag + index * topicStagger,
        territory: (chapterId) => arrival.get(chapterId)! + territoryLag,
        edge: (source, target) =>
            centre(target) < centre(source) ? last + backwardLag : Math.max(arrival.get(source)!, arrival.get(target)!) + edgeLag,
        labels: last + 0.8,
        end: Math.max(last + backwardLag + edgeDuration, last + territoryLag + cellSpawn.spread + cellSpawn.jitter + cellSpawn.duration),
        elapsed,
    };
}
