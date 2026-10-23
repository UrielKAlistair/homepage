import { createContext } from "react";
import type { TrailColor } from "./TrailData";

export const TrailActions = createContext({
    focusChapter: (_id: string) => {}, // bring to the top
    flyToChapter: (_id: string) => {}, // move the camera onto it
    moveChapterBy: (_id: string, _dx: number, _dy: number) => {}, // in flow units
    saveArrangement: () => {},
});

// The panel's outline and the title bar's edge are lit in the domain's colour; the bar itself is a
// thin wash of it
export const chapterColors: Record<TrailColor, { dot: string; panel: string; title: string }> = {
    orange: {
        dot: "bg-orange-400",
        panel: "border-orange-500/45",
        title: "border-orange-500/45 bg-orange-400/[0.08]",
    },
    red: {
        dot: "bg-red-400",
        panel: "border-red-400/40",
        title: "border-red-400/40 bg-red-400/[0.08]",
    },
    blue: {
        dot: "bg-blue-400",
        panel: "border-blue-400/40",
        title: "border-blue-400/40 bg-blue-400/[0.08]",
    },
    green: {
        dot: "bg-emerald-400",
        panel: "border-emerald-400/40",
        title: "border-emerald-400/40 bg-emerald-400/[0.08]",
    },
    white: {
        dot: "bg-slate-200",
        panel: "border-slate-200/40",
        title: "border-slate-200/40 bg-slate-200/[0.08]",
    },
};
