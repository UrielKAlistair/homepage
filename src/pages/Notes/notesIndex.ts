// Every notebook in /Notes becomes a page at /notes/<slug>, e.g. Linear_Programming.ipynb → /notes/linear-programming.
// The notebooks themselves are only fetched when their page is opened.

const files = import.meta.glob("/Notes/*.ipynb", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

const slugOf = (path: string) =>
    path
        .split("/")
        .pop()!
        .replace(/\.ipynb$/, "")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();

export const notebooks: Record<string, { file: string; load: () => Promise<string> }> = Object.fromEntries(
    Object.entries(files).map(([path, load]) => [slugOf(path), { file: path.slice(1), load }])
);

export const notesPath = (slug: string) => `/notes/${slug}`;

// The repo is public, so Colab can open a notebook straight from GitHub
export const colabUrl = (file: string) => `https://colab.research.google.com/github/UrielKAlistair/homepage/blob/main/${file}`;
