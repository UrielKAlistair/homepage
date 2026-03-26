export type Topic = {
    id: string;
    title: string;
    row?: number;
    column?: number;
};

export type ChapterDoc = {
    id: string;
    title: string;
    color: string;
    row: number;
    column: number;
    expandedSize?: {
        width: number;
        height: number;
    };
    topicLayout?: {
        direction: "DOWN" | "RIGHT";
    };
    topics?: Topic[];
    edges?: [string, string][];
};

export type ChapterEdge = [string, string];

export const chapters: ChapterDoc[] = [
    {
        id: "basic-ml",
        title: "Basic ML",
        color: "orange",
        row: 1,
        column: 0,
        expandedSize: { width: 560, height: 460 },
        topicLayout: { direction: "DOWN" },
        topics: [
            { id: "reg", title: "Regression" },
            { id: "clustering", title: "Clustering" },
            { id: "classification", title: "Classification" },
            { id: "MLP", title:"MLP"}
        ],
        edges: [
            ["classification", "MLP"],
        ],
    },
    {
        id: "deep-learning",
        title: "Deep Learning",
        color: "orange",
        row: 1,
        column: 3,
        topics: [],
        edges: [],
    },
    {
        id: "gen-ai",
        title: "Gen AI",
        color: "orange",
        row: 1,
        column: 1,
        topics: [],
        edges: [],
    },
    {
        id: "multi-armed-bandits",
        title: "Multi Armed Bandits",
        color: "orange",
        row: 1,
        column: 2,
        topics: [],
        edges: [],
    },
    {
        id: "linear-programming",
        title: "Linear Programming",
        color: "red",
        row: 2,
        column: 0,
        topics: [],
        edges: [],
    },
    {
        id: "convex-optimisation",
        title: "Convex Optimisation",
        color: "red",
        row: 2,
        column: 1,
        topics: [],
        edges: [],
    },
    {
        id: "linear-algebra",
        title: "Linear Algebra",
        color: "red",
        row: 2,
        column: 2,
        topics: [],
        edges: [],
    },
    {
        id: "complex-variables",
        title: "Complex Variables",
        color: "red",
        row: 2,
        column: 3,
        topics: [],
        edges: [],
    },
    {
        id: "integral-transformations",
        title: "Integral Transformations",
        color: "red",
        row: 2,
        column: 4,
        topics: [],
        edges: [],
    },
    {
        id: "statistical-physics",
        title: "Statistical Physics",
        color: "blue",
        row: 3,
        column: 0,
        topics: [],
        edges: [],
    },
    {
        id: "quantum-mechanics",
        title: "Quantum Mechanics",
        color: "blue",
        row: 3,
        column: 1,
        topics: [],
        edges: [],
    },
];

export const chapterEdges: ChapterEdge[] = [
    ["basic-ml", "deep-learning"],
    ["deep-learning", "gen-ai"],
    ["basic-ml", "multi-armed-bandits"],
    ["linear-algebra", "deep-learning"],
    ["convex-optimisation", "deep-learning"],
    ["complex-variables", "integral-transformations"],
    ["statistical-physics", "quantum-mechanics"],
];
