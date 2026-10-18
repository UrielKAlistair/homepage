import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/navbar";
import Calligraphy from "@/components/calligraphy";
import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { navHeight } from "@/lib/layout";
import { trailReadyEvent } from "./Trail/TrailLayout";
import TrailPreview from "./home/TrailPreview";
import PoetryHand from "./home/PoetryHand";
import { homeReadyEvent, lastPanel, playedPanels, rememberPanel, rememberPlayed } from "./home/homeSession";

// Three full-screen panels, one per scroll (CSS scroll snapping), with no scrollbar: dots on the
// right show where you are, and a chevron at the foot of a panel says there's more below.
// A panel's animation plays only while that panel is the one on screen, and only once per visit.
// Leaving a view (Trail, Poetry) comes back to the panel it was entered from.

const panels = [
    { id: "trail", label: "The Trail", path: "/trail" },
    { id: "poetry", label: "Poetry", path: "/poetry" },
    { id: "more", label: "More", path: null },
] as const;
type PanelId = (typeof panels)[number]["id"];
const isPanel = (id: unknown): id is PanelId => panels.some((panel) => panel.id === id);
const indexOf = (id: PanelId) => panels.findIndex((panel) => panel.id === id);

// The Trail page's canvas (see Trail.tsx: padding, then a 1px border), so the preview can show
// its view and grow straight into it
function trailCanvasSize() {
    const inset = (window.innerWidth >= 768 ? 24 : 12) + 1;
    return { width: window.innerWidth - inset * 2, height: window.innerHeight - navHeight() - inset * 2 };
}

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
    <section data-panel={id} className="relative flex h-[100dvh] snap-start snap-always flex-col items-center justify-center px-4 pb-8 pt-[var(--nav-h)]">
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
    const navigate = useTransitionNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo;
    const [initial] = useState<PanelId>(() => {
        const remembered = returnTo ?? lastPanel();
        return isPanel(remembered) ? remembered : "trail";
    });
    const [current, setCurrent] = useState<PanelId>(initial);
    const [played] = useState(playedPanels); // as of arriving; panels finished since then just stay finished
    const [trailFinished, setTrailFinished] = useState(played.has("trail"));
    const canvas = useWindowValue(trailCanvasSize);
    const aspect = canvas.width / canvas.height;
    const cardWidth = useWindowValue(cardWidthFor);

    // Open on the remembered panel before the first paint, so a transition back lands there.
    // The trail panel is ready only once its drawing is laid out (onTrailDrawn).
    useLayoutEffect(() => {
        const root = scrollRef.current;
        if (root) root.scrollTop = indexOf(initial) * root.clientHeight;
        if (initial !== "trail") window.dispatchEvent(new Event(homeReadyEvent));
    }, [initial]);

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

    const onTrailDrawn = useCallback(() => window.dispatchEvent(new Event(homeReadyEvent)), []);
    const onTrailFinished = useCallback(() => {
        setTrailFinished(true);
        rememberPlayed("trail");
    }, []);
    const onPoetryFinished = useCallback(() => rememberPlayed("poetry"), []);
    const onMoreFinished = useCallback(() => rememberPlayed("more"), []);
    const enterTrail = () => navigate("/trail", { state: { fromPreview: true }, readyEvent: trailReadyEvent });

    return (
        <div ref={scrollRef} className="home-panels h-[100dvh] snap-y snap-mandatory overflow-y-auto bg-night">
            <Navbar
                sections={{
                    current: panels.find((panel) => panel.id === current)?.path ?? null,
                    goTo: (to) => goTo(panels.findIndex((panel) => panel.path === to)),
                }}
            />

            <nav aria-label="Sections" className="fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 md:right-6">
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
                <button
                    type="button"
                    onClick={enterTrail}
                    aria-label="Enter the trail"
                    className="overflow-hidden rounded-3xl border border-white/10 bg-night-panel transition-colors hover:border-white/25"
                    style={{ aspectRatio: aspect, width: `min(88vw, calc((100dvh - 220px) * ${aspect}))`, viewTransitionName: "trail-map" }}
                >
                    <TrailPreview canvas={canvas} active={current === "trail"} complete={played.has("trail")} onDrawn={onTrailDrawn} onFinished={onTrailFinished} />
                </button>
                <button
                    type="button"
                    onClick={enterTrail}
                    tabIndex={trailFinished ? 0 : -1}
                    className={`mt-6 font-mono text-xs uppercase tracking-[0.25em] text-white/55 transition-all duration-700 hover:text-white ${trailFinished ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                >
                    Enter the trail →
                </button>
            </Panel>

            <Panel id="poetry" onNext={() => goTo(2)}>
                <Calligraphy src="/calligraphy-poetry.svg" active={current === "poetry"} complete={played.has("poetry")} className="mb-10 aspect-[219/94] w-[min(56vw,17rem)] text-white" />
                <PoetryHand active={current === "poetry"} cardWidth={cardWidth} complete={played.has("poetry")} onFinished={onPoetryFinished} />
            </Panel>

            <Panel id="more">
                <Calligraphy src="/calligraphy-placeholder.svg" active={current === "more"} complete={played.has("more")} onFinished={onMoreFinished} className="aspect-[362/77] w-[min(80vw,28rem)] text-white" />
            </Panel>
        </div>
    );
};

export default Home;
