export type TrailColor = "orange" | "red" | "blue";

// A prerequisite is either a whole chapter ("linear-algebra") or one of its topics
// ("linear-algebra/eigenvalues"). Inside a topic, a bare topic id means the same chapter.
// List only strict, direct prerequisites; anything implied by a longer path is dropped anyway.
export type Prerequisite = string;

export type Topic = {
    id: string;
    title: string;
    requires?: Prerequisite[];
    notes?: string; // link to the notes for this topic, once they're published
};

export type ChapterDoc = {
    id: string;
    title: string;
    color: TrailColor;
    requires?: Prerequisite[];
    notes?: string;
    topicDirection?: "DOWN" | "RIGHT"; // how topics flow inside the chapter (default RIGHT)
    topics?: Topic[];
};

// Legend and territory labels for the chapter colours
export const domains: { color: TrailColor; label: string }[] = [
    { color: "orange", label: "Machine Learning" },
    { color: "red", label: "Mathematics" },
    { color: "blue", label: "Physics" },
];

// Order matters only as a tie-break: which of two chapters at the same depth sits higher,
// and which journey is placed first.
export const chapters: ChapterDoc[] = [
    {
        id: "basic-ml",
        title: "Basic ML",
        color: "orange",
        topicDirection: "DOWN",
        topics: [
            { id: "reg", title: "Regression" },
            { id: "clustering", title: "Clustering" },
            { id: "classification", title: "Classification" },
            { id: "MLP", title: "MLP", requires: ["classification"] },
        ],
    },
    { id: "deep-learning", title: "Deep Learning", color: "orange", requires: ["basic-ml", "linear-algebra", "convex-optimisation"] },
    { id: "gen-ai", title: "Gen AI", color: "orange", requires: ["deep-learning"] },
    { id: "multi-armed-bandits", title: "Multi Armed Bandits", color: "orange", requires: ["basic-ml"] },
    { id: "linear-programming", title: "Linear Programming", color: "red" },
    { id: "convex-optimisation", title: "Convex Optimisation", color: "red" },
    { id: "linear-algebra", title: "Linear Algebra", color: "red" },
    { id: "complex-variables", title: "Complex Variables", color: "red" },
    { id: "integral-transformations", title: "Integral Transformations", color: "red", requires: ["complex-variables"] },
    { id: "statistical-physics", title: "Statistical Physics", color: "blue" },
    { id: "quantum-mechanics", title: "Quantum Mechanics", color: "blue", requires: ["statistical-physics"] },
];
