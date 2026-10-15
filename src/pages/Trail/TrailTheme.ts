import { createContext } from "react";
import type { TrailColor } from "./TrailData";

export const TrailActions = createContext({
    focusChapter: (_id: string) => {}, // bring to the top
    toggleChapter: (_id: string) => {}, // collapse or reopen in place
    flyToChapter: (_id: string) => {}, // move the camera onto it
    moveChapterBy: (_id: string, _dx: number, _dy: number) => {}, // in flow units
    saveArrangement: () => {},
});

export const chapterColors: Record<TrailColor, { circle: string; dot: string; panel: string; tint: string }> = {
    orange: {
        circle: "border-orange-200 bg-orange-400 shadow-[0_0_40px_rgba(251,146,60,0.25)]",
        dot: "bg-orange-400",
        panel: "border-orange-300/25",
        tint: "from-orange-400/[0.09]",
    },
    red: {
        circle: "border-red-200 bg-red-400 shadow-[0_0_40px_rgba(248,113,113,0.25)]",
        dot: "bg-red-400",
        panel: "border-red-300/25",
        tint: "from-red-400/[0.09]",
    },
    blue: {
        circle: "border-blue-200 bg-blue-400 shadow-[0_0_40px_rgba(96,165,250,0.25)]",
        dot: "bg-blue-400",
        panel: "border-blue-300/25",
        tint: "from-blue-400/[0.09]",
    },
    green: {
        circle: "border-emerald-200 bg-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.25)]",
        dot: "bg-emerald-400",
        panel: "border-emerald-300/25",
        tint: "from-emerald-400/[0.09]",
    },
    white: {
        circle: "border-white bg-slate-200 shadow-[0_0_40px_rgba(226,232,240,0.2)]",
        dot: "bg-slate-200",
        panel: "border-white/25",
        tint: "from-white/[0.06]",
    },
};
