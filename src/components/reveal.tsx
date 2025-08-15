import { useEffect, useRef, useState } from "react";
import ScrambleText from "./scramble";

const FRAME_COUNT = 46;
const FRAME_PATH = (index: number) =>
  `/hollow-knight/frame${String(index).padStart(4, "0")}.png`;

const LOOP_FRAMES = [41, 42, 43, 44];
const FPS = 14;
const FRAME_INTERVAL = 1000 / FPS;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

interface Props {
  text: string;
  className?: string;
}

const RevealSprite = ({ text, className = "" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textWrapperRef = useRef<HTMLDivElement>(null);
  const [visibleMask, setVisibleMask] = useState<boolean[]>([]);

  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [looping, setLooping] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [inView, setInView] = useState(false);
  const letterPositions = useRef<number[]>([]);

  // Load images on mount
  useEffect(() => {
    const loaded: HTMLImageElement[] = [];
    let count = 0;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        count++;
        if (count === FRAME_COUNT) {
          setImages(loaded);
        }
      };
      loaded.push(img);
    }
  }, []);

  // Measure letter positions once after mount
  useEffect(() => {
    if (!textWrapperRef.current) return;
    const spans = textWrapperRef.current.querySelectorAll("span");
    const offsets: number[] = [];
    spans.forEach((span) => {
      const rect = span.getBoundingClientRect();
      offsets.push(rect.left + rect.width / 2); // center of letter
    });
    letterPositions.current = offsets;
    setVisibleMask(new Array(offsets.length).fill(false));
  }, []);

  // Intersection Observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, {
      threshold: 0.65
    });

    observer.observe(canvasRef.current!);
    if (inView) {
      observer.disconnect()
    }

    return () => {
      observer.disconnect();
    };
  })

  // Animation
  useEffect(() => {
    if (images.length !== FRAME_COUNT) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;

    const screenW = window.innerWidth;
    const startX = 0;
    const endX = screenW + 2 * CANVAS_WIDTH;
    const moveDurationMs = 3000;
    const moveSpeed = (endX - startX) / (moveDurationMs / FRAME_INTERVAL);

    let internalFrame = 0;
    let loopIndex = 0;
    let currentX = startX;

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (!looping) {
        ctx.drawImage(images[internalFrame], 0, 0);
        if (!inView) return;

        internalFrame++;

        if (internalFrame >= 16) {
          currentX += moveSpeed;
          container.style.transform = `translate(${currentX}px, -30%)`;
          const newMask = letterPositions.current.map(
            (pos) => pos < currentX
          );
          setVisibleMask(newMask);

        }

        if (internalFrame >= FRAME_COUNT) {
          setLooping(true);
          internalFrame = LOOP_FRAMES[0];
        }

        if (currentX > endX) {
          setOpacity(0);
          clearInterval(interval);
        }
      }
      else {
        const loopFrame = LOOP_FRAMES[loopIndex % LOOP_FRAMES.length];
        ctx.drawImage(images[loopFrame], 0, 0);
        loopIndex++;

        currentX += moveSpeed;
        container.style.transform = `translate(${currentX}px, -30%)`;
        const newMask = letterPositions.current.map(
          (pos) => pos < currentX
        );
        setVisibleMask(newMask);


        if (currentX > endX) {
          setOpacity(0);
          clearInterval(interval);
        }
      }
    }, FRAME_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [images, inView]);

  return (
    <div>
      <div ref={textWrapperRef}>
        <ScrambleText
          text={text}
          visibleMask={visibleMask}
          className={className + " flex items-center justify-center"}
        />
      </div>

      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translate(0, -30%)",
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          zIndex: 9999,
          pointerEvents: "none",
          willChange: "transform",
          contain: "layout style size",
          opacity: opacity,
        }}
        className="hidden lg:block"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: "200px",
            height: "300px",
            background: "transparent",
          }}
        />
      </div>
    </div>
  );
};

export default RevealSprite;
