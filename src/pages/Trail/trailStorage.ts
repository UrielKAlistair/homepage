import type { XYPosition } from "@xyflow/react";

// A visitor's own arrangement of the trail, kept in their browser only
export type Arrangement = {
    chapters: Record<string, XYPosition>;
    order: string[]; // back to front; the last one is on top
};

const storageKey = "trail-arrangement";
const version = 2;

// Returns null when nothing is saved, storage is unavailable, or the saved chapters no longer
// match the current ones (a fresh layout is better than a half-stale one)
export function loadArrangement(chapterIds: string[]): Arrangement | null {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const saved = JSON.parse(raw) as { version: number } & Arrangement;
        const savedIds = Object.keys(saved.chapters ?? {});
        const matches = saved.version === version && savedIds.length === chapterIds.length && chapterIds.every((id) => saved.chapters[id]);
        return matches ? { chapters: saved.chapters, order: saved.order.filter((id) => chapterIds.includes(id)) } : null;
    } catch {
        return null;
    }
}

export function saveArrangement(arrangement: Arrangement) {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify({ version, ...arrangement }));
    } catch {
        // Storage full or blocked: the arrangement just won't survive a reload
    }
}

export function clearArrangement() {
    try {
        window.localStorage.removeItem(storageKey);
    } catch {
        // Nothing to clear
    }
}

// Remembered in the visitor's browser: once hidden, the intro stays closed on later visits
const introStorageKey = "trail-intro-hidden";

export function introHidden() {
    try {
        return window.localStorage.getItem(introStorageKey) === "1";
    } catch {
        return false;
    }
}

export function setIntroHidden(hidden: boolean) {
    try {
        if (hidden) window.localStorage.setItem(introStorageKey, "1");
        else window.localStorage.removeItem(introStorageKey);
    } catch {
        // Storage blocked: the intro will just show again next time
    }
}
