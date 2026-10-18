import { createContext } from "react";
import type { TrailColor } from "./TrailData";

export const TrailActions = createContext({
    focusChapter: (_id: string) => {}, // bring to the top
    flyToChapter: (_id: string) => {}, // move the camera onto it
    moveChapterBy: (_id: string, _dx: number, _dy: number) => {}, // in flow units
    saveArrangement: () => {},
});

export const chapterColors: Record<TrailColor, { dot: string; panel: string; tint: string }> = {
    orange: {
        dot: "bg-orange-400",
        panel: "border-orange-300/25",
        tint: "from-orange-400/[0.09]",
    },
    red: {
        dot: "bg-red-400",
        panel: "border-red-300/25",
        tint: "from-red-400/[0.09]",
    },
    blue: {
        dot: "bg-blue-400",
        panel: "border-blue-300/25",
        tint: "from-blue-400/[0.09]",
    },
    green: {
        dot: "bg-emerald-400",
        panel: "border-emerald-300/25",
        tint: "from-emerald-400/[0.09]",
    },
    white: {
        dot: "bg-slate-200",
        panel: "border-white/25",
        tint: "from-white/[0.06]",
    },
};
