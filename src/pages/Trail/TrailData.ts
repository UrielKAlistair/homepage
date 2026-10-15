export type TrailColor = "orange" | "red" | "blue" | "green" | "white";

// A prerequisite is either a whole chapter ("linear-algebra") or one of its topics
// ("linear-algebra/eigenvalues"). Inside a topic, a bare topic id means the same chapter.
// `requires` lists strict prerequisites (solid arrows); `softRequires` lists ones that help a lot
// but aren't essential (dotted arrows). Anything implied by a longer strict path is dropped anyway.
export type Prerequisite = string;

export type Topic = {
    id: string;
    title: string;
    requires?: Prerequisite[];
    softRequires?: Prerequisite[];
    notes?: string; // a notebook in /Notes, by slug: Linear_Programming.ipynb is "linear-programming"
};

export type ChapterDoc = {
    id: string;
    title: string;
    color: TrailColor;
    requires?: Prerequisite[];
    softRequires?: Prerequisite[];
    notes?: string;
    topicDirection?: "DOWN" | "RIGHT"; // how topics flow inside the chapter (default RIGHT)
    topics?: Topic[];
};

// The domains in the intro, and the territory labels. A domain with no chapters yet only shows in the intro.
export const domains: { color: TrailColor; label: string }[] = [
    { color: "orange", label: "Machine Learning" },
    { color: "red", label: "Mathematics" },
    { color: "blue", label: "Physics" },
    { color: "green", label: "Electrical Engineering" },
    { color: "white", label: "Miscellaneous" },
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
            { id: "reg", title: "Regression", notes: "regression" },
            { id: "clustering", title: "Clustering" },
            { id: "classification", title: "Classification", notes: "classification" },
            { id: "MLP", title: "MLP", requires: ["classification"] },
        ],
    },
    { id: "deep-learning", title: "Deep Learning", color: "orange", requires: ["basic-ml", "linear-algebra", "convex-optimisation"] },
    { id: "gen-ai", title: "Gen AI", color: "orange", requires: ["deep-learning"] },
    { id: "multi-armed-bandits", title: "Multi Armed Bandits", color: "orange", requires: ["basic-ml"] },
    { id: "linear-programming", title: "Linear Programming", color: "red", notes: "linear-programming" },
    { id: "convex-optimisation", title: "Convex Optimisation", color: "red" },
    { id: "linear-algebra", title: "Linear Algebra", color: "red" },
    { id: "complex-variables", title: "Complex Variables", color: "red" },
    { id: "integral-transformations", title: "Integral Transformations", color: "red", requires: ["complex-variables"] },
    { id: "statistical-physics", title: "Statistical Physics", color: "blue" },
    { id: "quantum-mechanics", title: "Quantum Mechanics", color: "blue", requires: ["statistical-physics"] },
];
