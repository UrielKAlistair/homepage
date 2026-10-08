import { useLayoutEffect, useRef, useState } from "react";

interface BorderTraceProps {
  radius: number; // px, border radius of the box being traced
  duration?: number;
  glowLength?: number; // px, length of each travelling glow
  threshold?: number; // fraction of the box that must be on screen before tracing starts (0 = any of it)
  onDone?: () => void;
}

// Stacked dashes sharing a head give each glow a tail that fades out behind it
const GLOW_LAYERS = [
  { length: 1, opacity: 0.25 },
  { length: 0.55, opacity: 0.5 },
  { length: 0.2, opacity: 1 },
];
const HIDDEN_DASH = "0 100000";

// One half of the rounded outline, from the top midpoint down one side to the bottom midpoint.
// Coordinates are inset half a pixel so the 1px stroke lands exactly on a 1px CSS border.
function halfOutline(width: number, height: number, r: number, side: "left" | "right") {
  const x0 = 0.5, y0 = 0.5, x1 = width - 0.5, y1 = height - 0.5;
  const mid = width / 2;
  return side === "right"
    ? `M ${mid} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} V ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${mid}`
    : `M ${mid} ${y0} H ${x0 + r} A ${r} ${r} 0 0 0 ${x0} ${y0 + r} V ${y1 - r} A ${r} ${r} 0 0 0 ${x0 + r} ${y1} H ${mid}`;
}

// Overlays its (relatively positioned) parent. Once the parent is on screen, two glows leave the top
// midpoint, travel opposite ways and meet at the bottom, leaving a border behind them. Then the whole
// overlay fades out and onDone fires, so the parent can reveal the box with its real border.
const BorderTrace = ({ radius, duration = 900, glowLength = 60, threshold = 0, onDone }: BorderTraceProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRefs = useRef<(SVGPathElement | null)[]>([]);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [traced, setTraced] = useState(reduceMotion);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useLayoutEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.();
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          visibilityObserver.disconnect();
        }
      },
      { threshold }
    );
    resizeObserver.observe(svg);
    visibilityObserver.observe(svg);
    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [reduceMotion, threshold]);

  const hasSize = size !== null;
  useLayoutEffect(() => {
    if (!hasSize || !visible || traced) return;

    const timing: KeyframeAnimationOptions = { duration, easing: "ease-in-out", fill: "forwards" };
    const animations: Animation[] = [];

    trailRefs.current.forEach((path) => {
      if (!path) return;
      const half = path.getTotalLength();
      path.style.strokeDasharray = `${half} ${half}`;
      animations.push(path.animate([{ strokeDashoffset: half }, { strokeDashoffset: 0 }], timing));
    });

    glowRefs.current.forEach((path, index) => {
      if (!path) return;
      const half = path.getTotalLength();
      const length = Math.min(glowLength, half / 3) * GLOW_LAYERS[index % GLOW_LAYERS.length].length;
      // A single dash of `length` whose head sits at the trail's head
      path.style.strokeDasharray = `${length} ${half + length}`;
      animations.push(path.animate([{ strokeDashoffset: length }, { strokeDashoffset: length - half }], timing));
    });

    animations[0]?.finished
      .then(() => {
        setTraced(true);
        onDoneRef.current?.();
      })
      .catch(() => {}); // cancelled on unmount

    return () => animations.forEach((animation) => animation.cancel());
  }, [hasSize, visible, traced, duration, glowLength]);

  if (reduceMotion) return null;

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const r = Math.max(0, Math.min(radius - 0.5, width / 2 - 0.5, height / 2 - 0.5));
  const sides = ["left", "right"] as const;

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-20 h-full w-full transition-opacity duration-500 ${traced ? "opacity-0" : "opacity-100"}`}
    >
      {size && (
        <>
          {sides.map((side, i) => (
            <path
              key={side}
              ref={(node) => { trailRefs.current[i] = node; }}
              d={halfOutline(width, height, r, side)}
              fill="none"
              className="stroke-border"
              style={{ strokeDasharray: HIDDEN_DASH }}
            />
          ))}
          <g style={{ filter: "drop-shadow(0 0 4px rgba(56, 189, 248, 0.7))" }}>
            {sides.flatMap((side, s) =>
              GLOW_LAYERS.map((layer, l) => (
                <path
                  key={`${side}-${l}`}
                  ref={(node) => { glowRefs.current[s * GLOW_LAYERS.length + l] = node; }}
                  d={halfOutline(width, height, r, side)}
                  fill="none"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  className="stroke-sky-300"
                  style={{ strokeDasharray: HIDDEN_DASH, strokeOpacity: layer.opacity }}
                />
              ))
            )}
          </g>
        </>
      )}
    </svg>
  );
};

export default BorderTrace;
