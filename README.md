# Homepage

My personal site, live at **[uka-home.vercel.app](https://uka-home.vercel.app)**.

## What's on it

- **Trail** (`/trail`): a map of much of the knowledge I have acquired. Topics that span maths, CS and physics are showcased as a directed graph along the trail of my learning. I've detailed out my lines of thought in learning these ideas, and these "notes" were primarily written to my future self, who has likely forgotten many of the finer details. These notes describe a journey of discovery, and typically show a continuous logical line of thought. As of now, most notes aren't live, as I'm still unearthing, reviewing and editing my dusty old notes. 

  Individual note files reside at `/notes/<name>`; some are ipynbs, some are digitally handwritten, and others are scans of handwritten work.
- **Poetry** (`/poetry`): a collection of my poetry.
- **About** and **CV**: a short introduction on the home page, and my CV as a PDF from the navbar.

## Built with

Vite, React and TypeScript, styled with Tailwind CSS and shadcn/ui components. The Trail map uses React Flow; animations use anime.js. Deployed on Vercel.

## Running it locally

Needs Node.js 18 or later.

```sh
npm install
npm run dev       # development server at http://localhost:8080
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Layout

- `src/pages/home/` — the home page and its panels (Trail, Poetry, About)
- `src/pages/Trail/` — the Trail map; its chapters and prerequisites are in `TrailData.ts`
- `src/pages/Notes/` — the notebook renderer
- `Notes/` — the notebooks; any `.ipynb` added here gets a page at `/notes/<slug>`
- `public/` — the CV, poem artwork and other static files
- `scripts/text-to-calligraphy-svg.mjs` — turns a word into the hand-written SVG used for the section headings
