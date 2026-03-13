import { useLayoutEffect, useEffect, useRef, useState } from "react";

interface RevealConfig {
  text: string;
  startThreshold?: number;
  moveThreshold?: number;
  moveDurationMs?: number;
}

const RevealOverlay = (config: RevealConfig) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  const {
    text,
    startThreshold = 0.1,
    moveThreshold = 0.3,
    moveDurationMs = 3000,
  } = config;

  const frameCount = 46
  const framePath = (index: number) => `/hollow-knight/frame${String(index).padStart(4, "0")}.png`

  // 1. Load Images (for animation)
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  useEffect(() => {
    const loaded: HTMLImageElement[] = [];
    let count = 0;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        count++;
        if (count === frameCount) {
          setImages(loaded);
          console.log(`Loaded ${frameCount} images`);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${framePath(i)}`);
      };
      loaded.push(img);
    }
  }, []);

  // 2. Update font size and letter positions on resize (needed for revealing with the moving canvas)
  const [fontSize, setFontSize] = useState<number>(80);
  const letterPositions = useRef<number[]>([]);
  const [isReady, setIsReady] = useState(false); // animation shouldn't start moving until we have positions
  const [canvasWidth, setCanvasWidth] = useState(200);
  const canvasHeight = canvasWidth * 1.5

  useLayoutEffect(() => {
    function updateLayout() {
      const MONOSPACE_ASPECT = 0.6;
      const screenWidth = window.innerWidth;
      const targetWidth = screenWidth * 0.75;
      const size = Math.min(targetWidth / (text.length * MONOSPACE_ASPECT), 80);
      setFontSize(size);
      setCanvasWidth(Math.sqrt(size * 500));

      requestAnimationFrame(() => {
        if (!textRef.current) return;
        const spans = textRef.current.querySelectorAll("span");
        if (!spans || spans.length === 0) return;

        const offsets: number[] = [];
        spans.forEach((span) => {
          const rect = span.getBoundingClientRect();
          offsets.push(rect.left + rect.width / 2);
        });

        letterPositions.current = offsets;
        setIsReady(true);
        console.log("Letter positions recalculated:", offsets.length);
      });
    }

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [text]);

  // 3. Start animation when user sees it
  const [inView, setInView] = useState(false);
  const [startMove, setStartMove] = useState(false);
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !isReady) return; // checking !element is a safeguard, isReady should prevent this.

    const animObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log("Animation triggered");
          setInView(true);
          animObserver.disconnect();
        }
      },
      { threshold: startThreshold }
    );

    const moveObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log("Movement triggered");
          setStartMove(true);
          moveObserver.disconnect();
        }
      },
      { threshold: moveThreshold }
    );

    animObserver.observe(element);
    moveObserver.observe(element);
    return () => {
      animObserver.disconnect();
      moveObserver.disconnect();
    }
  }, [isReady, moveThreshold, startThreshold]);

  // 4. Knight Animation

  const fps = 14
  const yShift = -55
  const [visibleMask, setVisibleMask] = useState<boolean[]>(Array(text.length).fill(false)); // Animation reveals content
  const [canvasOpacity, setCanvasOpacity] = useState(1); // Disappear at end
  useEffect(() => {
    if (images.length !== frameCount || !inView) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return; // safeguard, won't occur because the element is literally inView

    const FRAME_INTERVAL = 1000 / fps;
    const screenW = window.innerWidth;
    const startX = 0;
    const endX = screenW + canvasWidth;
    const moveSpeed = (endX - startX) / (moveDurationMs / FRAME_INTERVAL);

    const idleFrames = { end: 13, loopStart: 10 };
    const moveFrames = { start: 16, end: frameCount, loopStart: 41 };

    let currentX = startX;
    let frame = 0;

    const interval = setInterval(() => {

      frame++;
      if (!startMove && frame > idleFrames.end) {
        frame = idleFrames.loopStart;
      }

      if (frame >= frameCount) {
        frame = moveFrames.loopStart;
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(images[frame], 0, 0, canvasWidth, canvasHeight);

      if (startMove && frame >= moveFrames.start) {
        currentX += moveSpeed;
        container.style.transform = `translate(${currentX}px , ${yShift}%)`;

        // Update visible mask based on sprite position
        const containerRect = container.getBoundingClientRect();
        const spriteCenterX = containerRect.left + canvasWidth / 2;

        setVisibleMask((prevMask) => {
          const nextMask = letterPositions.current.map((pos) => pos < spriteCenterX);
          const hasSameLength = prevMask.length === nextMask.length;
          const isSameMask = hasSameLength && prevMask.every((value, index) => value === nextMask[index]);
          return isSameMask ? prevMask : nextMask;
        });
      }

      if (currentX > endX) {
        setCanvasOpacity(0);
        clearInterval(interval);
        console.log("Animation complete");
      }
    }, FRAME_INTERVAL);

    return () => clearInterval(interval);

  }, [images, inView, startMove, canvasWidth, canvasHeight, moveDurationMs, yShift])


  // 5. Scramble underlying text

  const startIndex = 0;
  const scrambleDuration = (index: number) => 5 + index;
  const visiblefromRef = useRef<number[]>(Array(text.length).fill(-1));
  // The iteration number at which letters became visible, used to track duration for which a letter has been scrambling; 
  // Letters have higher of adopting the correct value the longer they have been scrambling, and finalise after a set duration. 
  const finalizedRef = useRef<boolean[]>(Array(text.length).fill(false));
  const [displayText, setDisplayText] = useState(text);
  const iterationRef = useRef(0);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  useEffect(() => {
    const el = textRef.current;
    if (!el || !visibleMask[startIndex]) return; // Don't scramble for a bit

    const interval = setInterval(() => {
      const iteration = iterationRef.current;

      setDisplayText(
        text.split("").map((char, index) => {
          if (finalizedRef.current[index]) {
            return char;
          }

          if (index <= startIndex || char === " ") {
            finalizedRef.current[index] = true;
            return char;
          }

          if (visibleMask[index] && visiblefromRef.current[index] === -1) {
            visiblefromRef.current[index] = iteration;
          }

          const visibleFrom = visiblefromRef.current[index];
          if (visibleFrom !== -1) {
            const progress = iteration - visibleFrom;
            const duration = scrambleDuration(index);

            if (progress > duration) {
              finalizedRef.current[index] = true;
              return char;
            } else {
              const probability = progress / duration * 0.5;
              return Math.random() < probability
                ? char
                : letters[Math.floor(Math.random() * letters.length)];
            }
          }

          return letters[Math.floor(Math.random() * letters.length)];
        }).join("")
      );

      iterationRef.current += 1;

      // Stop if all letters are finalized
      if (finalizedRef.current.every(f => f)) {
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [visibleMask, text]);

  return (
    <div className="relative w-full flex items-center justify-center">
      {/* Scramble text */}
      <h1
        ref={textRef}
        style={{ fontSize: `${fontSize}px` }}
        className={`matrix-text font-mono tracking-wider z-10`}
      >
        {displayText.split("").map((char, i) => (
          <span
            key={i}
            style={{
              opacity: visibleMask[i] ? 1 : 0,
              transition: "opacity 0.1s linear",
              whiteSpace: "pre",
              display: "inline-block",
            }}
          >
            {char}
          </span>
        ))}
      </h1>

      {/* Sprite container */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: `translate(0, ${yShift}%)`,
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          zIndex: 20,
          pointerEvents: "none",
          willChange: "transform",
          opacity: canvasOpacity,
          transition: "opacity 0.3s ease-out",
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            background: "transparent",
          }}
        />
      </div>
    </div>
  );
};

export default RevealOverlay
