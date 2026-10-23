export type TrailColor = "orange" | "red" | "blue" | "green" | "white";

// A prerequisite is a whole chapter ("linear-algebra"), one of its sections ("math-101/side-a")
// or one of its topics ("linear-algebra/eigenvalues"). Inside a topic, a bare topic id means the same chapter.
// `requires` lists strict prerequisites (solid arrows); `softRequires` lists ones that help a lot
// but aren't essential (dotted arrows). Anything implied by a longer strict path is dropped anyway.
export type Prerequisite = string;

export type Topic = {
    id: string;
    title: string;
    requires?: Prerequisite[];
    softRequires?: Prerequisite[];
    notes?: string; // a notebook in /Notes, by slug: Linear_Programming.ipynb is "linear-programming"
    hint?: string; // shown on hover
};

// Part of a chapter with its own prerequisites, drawn as a band of the panel with no title of its own
export type Section = {
    id: string;
    topicDirection?: "DOWN" | "RIGHT";
    topics: Topic[];
};

export type ChapterDoc = {
    id: string;
    title: string;
    color: TrailColor;
    at?: { x: number; y: number }; // where it sits on wide screens, in flow units
    requires?: Prerequisite[];
    softRequires?: Prerequisite[];
    notes?: string;
    topicDirection?: "DOWN" | "RIGHT"; // how topics flow inside the chapter (default RIGHT)
    topics?: Topic[]; // a chapter has topics or sections, not both
    sections?: Section[]; // stacked top to bottom
};

export const topicsOf = (chapter: ChapterDoc) => chapter.topics ?? chapter.sections?.flatMap((s) => s.topics) ?? [];

// The domains in the intro, and the territory labels. A domain with no chapters yet only shows in the intro.
export const domains: { color: TrailColor; label: string }[] = [
    { color: "orange", label: "Machine Learning" },
    { color: "red", label: "Mathematics" },
    { color: "blue", label: "Physics" },
    { color: "green", label: "Computer Science" },
    { color: "white", label: "Miscellaneous" },
];

// What the home page's preview frames on wide screens
export const previewChapters = ["math-miscellany", "math-101", "basic-ml", "statistical-physics", "quantum-mechanics"];

// Order matters only as a tie-break: which of two chapters at the same depth sits higher,
// and which journey is placed first.
export const chapters: ChapterDoc[] = [
    {
        id: "basic-ml",
        title: "Basic ML",
        color: "orange",
        at: { x: 690, y: -230 },
        requires: ["math-101/side-a"],
        topicDirection: "DOWN",
        topics: [
            { id: "reg", title: "Regression", notes: "regression" },
            { id: "clustering", title: "Clustering" },
            { id: "classification", title: "Classification", notes: "classification" },
            { id: "MLP", title: "MLP", requires: ["classification"] },
        ],
    },
    { id: "deep-learning", title: "Deep Learning", color: "orange", at: { x: 1470, y: -225 }, requires: ["basic-ml"] },
    { id: "gen-ai", title: "Gen AI", color: "orange", at: { x: 1870, y: -225 }, requires: ["deep-learning"] },
    { id: "multi-armed-bandits", title: "Multi Armed Bandits", color: "orange", at: { x: 1475, y: -35 }, requires: ["basic-ml"] },
    {
        id: "math-101",
        title: "Math 101",
        color: "red",
        at: { x: 0, y: 0 },
        sections: [
            {
                id: "side-a",
                topicDirection: "DOWN",
                topics: [
                    { id: "linear-algebra", title: "Linear Algebra" },
                    { id: "probability", title: "Probability", softRequires: ["integral-transformations"] },
                ],
            },
            {
                id: "side-b",
                topics: [
                    { id: "complex-variables", title: "Complex Variables" },
                    { id: "integral-transformations", title: "Integral Transformations", requires: ["complex-variables"] },
                ],
            },
        ],
    },
    {
        id: "math-miscellany",
        title: "Math Miscellany",
        color: "red",
        at: { x: 0, y: -300 },
        topics: [
            { id: "convex-optimisation", title: "Convex Optimisation" },
            { id: "linear-programming", title: "Linear Programming", notes: "linear-programming" },
            { id: "group-theory", title: "Group Theory" },
        ],
    },
    { id: "statistical-physics", title: "Statistical Physics", color: "blue", at: { x: 690, y: 50 }, requires: ["math-101"] },
    {
        id: "quantum-mechanics",
        title: "Quantum Mechanics",
        color: "blue",
        at: { x: 690, y: 250 },
        requires: ["math-101"],
        topics: [
            { id: "basic", title: "Basic QM" },
            { id: "qcqi", title: "QCQI", hint: "Quantum Computation and Quantum Information", requires: ["basic"] },
        ],
    },
    {
        id: "theoretical-cryptography",
        title: "Theoretical Cryptography",
        color: "green",
        at: { x: -400, y: 30 },
        requires: ["math-miscellany/group-theory"],
        topics: [
            { id: "internet-security", title: "Internet Security" },
            { id: "provable-security", title: "Provable Security" },
        ],
    },
];
