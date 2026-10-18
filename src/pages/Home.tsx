import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/navbar";
import Calligraphy from "@/components/calligraphy";
import poetryWord from "@/assets/calligraphy-poetry.svg?raw";
import trailWord from "@/assets/calligraphy-trail.svg?raw";
import aboutWord from "@/assets/calligraphy-about.svg?raw";
import { transitionDoneEvent } from "@/hooks/use-transition-navigate";
import { navHeight, stageInset } from "@/lib/layout";
import TrailStage from "./home/TrailStage";
import PoetryHand from "./home/PoetryHand";
import AboutPanel from "./home/AboutPanel";
import { homeReadyEvent, lastPanel, playedPanels, rememberPanel, rememberPlayed } from "./home/homeSession";

// Three full-screen panels, one per scroll (CSS scroll snapping), with no scrollbar: dots on the
// right show where you are, and a chevron at the foot of a panel says there's more below.
// A panel's animation plays only while that panel is the one on screen, and only once per visit.
// The trail panel holds the trail map itself, which grows to fill the screen at /trail (see
// TrailStage); Poetry is its own page. Leaving either comes back to the panel it was entered from.
// The navbar's links name panels too: here they scroll to their panel (leaving the full-size map
// first), and from any other page they come back here, landing on it.

const panels = [
    { id: "trail", label: "The Trail" },
    { id: "poetry", label: "Poetry" },
    { id: "about", label: "About" },
] as const;
type PanelId = (typeof panels)[number]["id"];
const isPanel = (id: unknown): id is PanelId => panels.some((panel) => panel.id === id);
const indexOf = (id: PanelId) => panels.findIndex((panel) => panel.id === id);

// The full-size trail map's drawing area: the window below the navbar, inset, inside a 1px border
function trailCanvasSize() {
    const inset = stageInset() + 1;
    return { width: window.innerWidth - inset * 2, height: window.innerHeight - navHeight() - inset * 2 };
}

// The panels' headings, written in calligraphy at one size: "Poetry" takes the heading width, and
// every other word is scaled with it
const headingWidth = "min(56vw, 17rem)";
const svgSize = (svg: string) => {
    const [width, height] = svg.match(/width="([\d.]+)" height="([\d.]+)"/)!.slice(1).map(Number);
    return { width, height };
};
const poetryWidth = svgSize(poetryWord).width;
const headingStyle = (svg: string) => {
    const { width, height } = svgSize(svg);
    return { width: `calc(${headingWidth} * ${width / poetryWidth})`, aspectRatio: `${width} / ${height}` };
};
const headingHeight = (svg: string) => `calc(${headingWidth} * ${svgSize(svg).height / poetryWidth})`;

const cardWidthFor = () => (window.innerWidth >= 768 ? 170 : 112);

function useWindowValue<T>(read: () => T) {
    const [value, setValue] = useState(read);
    useEffect(() => {
        let timer = 0;
        const onResize = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setValue(read()), 200);
        };
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            window.clearTimeout(timer);
        };
    }, [read]);
    return value;
}

const Panel = ({ id, children, onNext }: { id: PanelId; children: ReactNode; onNext?: () => void }) => (
    <section data-panel={id} className="relative flex h-[100dvh] snap-start overflow-x-clip snap-always flex-col items-center justify-center px-4 pb-8 pt-[var(--nav-h)]">
        {/* A soft navy light behind each panel's centrepiece */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_52%,rgba(37,60,130,0.22),transparent_70%)]" />
        <div className="relative flex w-full flex-col items-center">{children}</div>
        {onNext && (
            <button type="button" onClick={onNext} aria-label="Next" className="home-scroll-cue absolute bottom-4 left-1/2 -translate-x-1/2 p-2 text-white/35 transition-colors hover:text-white/80">
                <ChevronDown className="h-6 w-6" />
            </button>
        )}
    </section>
);

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const expanded = location.pathname === "/trail";
    const scrollRef = useRef<HTMLDivElement>(null);
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
    const [initial] = useState<PanelId>(() => {
        const remembered = expanded ? "trail" : (returnTo ?? lastPanel());
        return isPanel(remembered) ? remembered : "trail";
    });
    const [current, setCurrent] = useState<PanelId>(initial);
    // As of arriving; panels finished since then just stay finished. Arriving at /trail, the map is already full size.
    const [played] = useState(() => (expanded ? new Set([...playedPanels(), "trail"]) : playedPanels()));
    const canvas = useWindowValue(trailCanvasSize);
    const cardWidth = useWindowValue(cardWidthFor);

    // Open on the remembered panel before the first paint, so a transition back lands there.
    // A panel is ready once its images are decoded, so nothing pops in during the transition.
    useLayoutEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        root.scrollTop = indexOf(initial) * root.clientHeight;
        const images = [...root.querySelectorAll<HTMLImageElement>(`[data-panel="${initial}"] img`)];
        Promise.all(images.map((image) => image.decode().catch(() => {}))).then(() => window.dispatchEvent(new Event(homeReadyEvent)));
    }, [initial]);

    // Coming back from a view lands on a finished panel: leaving counts the panel on screen as seen
    const currentRef = useRef(current);
    currentRef.current = current;
    useEffect(() => () => rememberPlayed(currentRef.current), []);

    // Returning to another panel, the trail map (heavy to build) waits until the transition is
    // over, so it can't stall the cards' flight
    const [drawTrail, setDrawTrail] = useState(!returnTo || initial === "trail" || !document.startViewTransition);
    useEffect(() => {
        if (drawTrail) return;
        const draw = () => setDrawTrail(true);
        window.addEventListener(transitionDoneEvent, draw, { once: true });
        const fallback = window.setTimeout(draw, 3000);
        return () => {
            window.removeEventListener(transitionDoneEvent, draw);
            window.clearTimeout(fallback);
        };
    }, [drawTrail]);

    useEffect(() => rememberPanel(current), [current]);

    // The panel filling most of the screen is the current one
    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) setCurrent((entry.target as HTMLElement).dataset.panel as PanelId);
                }
            },
            { root, threshold: 0.6 }
        );
        root.querySelectorAll("[data-panel]").forEach((panel) => observer.observe(panel));
        return () => observer.disconnect();
    }, []);

    const goTo = (index: number) => {
        const root = scrollRef.current;
        root?.scrollTo({ top: index * root.clientHeight, behavior: "smooth" });
    };

    // A panel's centrepiece waits until its heading is (nearly) written
    const [written, setWritten] = useState(() => new Set<PanelId>([...played].filter(isPanel)));
    const headingWritten = (id: PanelId) => () => setWritten((ids) => new Set(ids).add(id));
    const onTrailFinished = useCallback(() => rememberPlayed("trail"), []);
    const onPoetryFinished = useCallback(() => rememberPlayed("poetry"), []);
    const onAboutFinished = useCallback(() => rememberPlayed("about"), []);
    const enterTrail = () => navigate("/trail", { state: { fromHome: true } });
    // Back through history when the map was entered from here, so the browser's Back agrees
    const exitTrail = () => ((location.state as { fromHome?: boolean } | null)?.fromHome ? navigate(-1) : navigate("/"));

    // A navbar link chosen on the full-size map: the map leaves, and the page is already at the
    // panel when it starts shrinking (TrailStage measures where to shrink to in a later effect)
    const leavingFor = useRef<PanelId | null>(null);
    const showPanel = (id: string) => {
        if (!isPanel(id)) return;
        if (!expanded) return goTo(indexOf(id));
        leavingFor.current = id;
        exitTrail();
    };
    useLayoutEffect(() => {
        const root = scrollRef.current;
        if (expanded || !root || !leavingFor.current) return;
        root.scrollTop = indexOf(leavingFor.current) * root.clientHeight;
        leavingFor.current = null;
    }, [expanded]);

    return (
        <div ref={scrollRef} className={`home-panels h-[100dvh] snap-y snap-mandatory bg-night ${expanded ? "overflow-hidden" : "overflow-y-auto"}`}>
            <Navbar overlay sections={{ current, goTo: showPanel }} />

            <nav aria-label="Sections" className={`fixed right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 md:right-6 ${expanded ? "hidden" : ""}`}>
                {panels.map((panel, i) => (
                    <button
                        key={panel.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={panel.label}
                        aria-current={current === panel.id ? "true" : undefined}
                        className="group relative flex h-6 w-6 items-center justify-center"
                    >
                        <span className={`block w-1.5 rounded-full transition-all duration-300 ${current === panel.id ? "h-5 bg-white/80" : "h-1.5 bg-white/30 group-hover:bg-white/60"}`} />
                        <span className="pointer-events-none absolute right-7 whitespace-nowrap font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/60 opacity-0 transition-opacity group-hover:opacity-100">
                            {panel.label}
                        </span>
                    </button>
                ))}
            </nav>

            <Panel id="trail" onNext={() => goTo(1)}>
                <div className="mb-10" style={headingStyle(trailWord)}>
                    <Calligraphy svg={trailWord} active={current === "trail"} complete={played.has("trail")} onWritten={headingWritten("trail")} className="h-full w-full text-white" />
                </div>
                {/* As large as fits below the heading, above the chevron */}
                <div style={{ width: `min(88vw, calc((100dvh - 180px - ${headingHeight(trailWord)} - 2.5rem) * ${(canvas.width + 2) / (canvas.height + 2)}))` }}>
                    {drawTrail && (
                        <TrailStage
                            canvas={canvas}
                            expanded={expanded}
                            active={current === "trail" && written.has("trail")}
                            complete={played.has("trail")}
                            onEnter={enterTrail}
                            onExit={exitTrail}
                            onFinished={onTrailFinished}
                        />
                    )}
                </div>
            </Panel>

            <Panel id="poetry" onNext={() => goTo(2)}>
                <div className="mb-10" style={headingStyle(poetryWord)}>
                    <Calligraphy svg={poetryWord} active={current === "poetry"} complete={played.has("poetry")} onWritten={headingWritten("poetry")} className="h-full w-full text-white" />
                </div>
                <PoetryHand active={current === "poetry" && written.has("poetry")} cardWidth={cardWidth} complete={played.has("poetry")} onFinished={onPoetryFinished} />
            </Panel>

            <Panel id="about">
                <div className="mb-4 md:mb-8" style={headingStyle(aboutWord)}>
                    <Calligraphy svg={aboutWord} active={current === "about"} complete={played.has("about")} onWritten={headingWritten("about")} onFinished={onAboutFinished} className="h-full w-full text-white" />
                </div>
                <AboutPanel active={current === "about" && written.has("about")} />
            </Panel>
        </div>
    );
};

export default Home;
