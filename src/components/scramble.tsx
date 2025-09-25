import { useEffect, useRef, useState } from "react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Props {
  text: string;
  className?: string;
  visibleMask: boolean[];
}

const ScrambleText = ({ text, visibleMask, className = "" }: Props) => {
  const startIndex = 0;
  const ref = useRef<HTMLHeadingElement>(null);
  const scrambleDuration = (index) => { return 5 + index; }

  const visiblefromRef = useRef<number[]>(Array(text.length).fill(-1));
  const finalizedRef = useRef<boolean[]>(Array(text.length).fill(false));
  const [displayText, setDisplayText] = useState(text);
  const iterationRef = useRef(0);
  const [fontSize, setFontSize] = useState<number>(80);

  // calculate font size
  useEffect(() => {
    function updateFontSize() {
      const MONOSPACE_ASPECT = 0.6
      const screenWidth = window.innerWidth;
      const targetWidth = screenWidth * 0.75;
      const size = Math.min(targetWidth / (text.length * MONOSPACE_ASPECT), 80);
      setFontSize(size);
    }

    updateFontSize();
    window.addEventListener("resize", updateFontSize);
    return () => window.removeEventListener("resize", updateFontSize);
  }, [text]);


  // scramble logic
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!visibleMask[startIndex]) return;

    el.dataset.value = text;
    let interval: ReturnType<typeof setInterval> | null = null;

    interval = setInterval(() => {
      if (!el.dataset.value) return;
      const iteration = iterationRef.current;
      setDisplayText(prev =>
        prev.split("").map((_, index) => {

          if (finalizedRef.current[index]) {
            return text[index];
          }

          if (index <= startIndex || text[index] === " ") {
            finalizedRef.current[index] = true;
            return text[index];
          }

          if (visibleMask[index] && visiblefromRef.current[index] === -1) {
            visiblefromRef.current[index] = iteration;
          }

          const progress = iteration - visiblefromRef.current[index];
          if (visiblefromRef.current[index] !== -1) {
            if (progress > scrambleDuration(index)) {
              finalizedRef.current[index] = true;
              return text[index];
            }
            else {
              return Math.random() < progress / scrambleDuration(index) * 0.5 ? text[index] : letters[Math.floor(Math.random() * letters.length)];
            }
          }

          return letters[Math.floor(Math.random() * letters.length)];
        }).join("")
      );

      iterationRef.current += 1;
    }, 35);

    return () => {
      if (interval) clearInterval(interval);
    };

  }, [visibleMask]);

  return (
    <h1 ref={ref} style={{ fontSize: `${fontSize}px` }} className={className}>
      {displayText.split("").map((char, i) => (
        <span
          key={i}
          style={{
            opacity: visibleMask[i] ? 1 : 0,
            transition: "opacity 0.1s linear",
            whiteSpace: "pre",
          }}
        >
          {char}
        </span>
      ))}
    </h1>
  );
};

export default ScrambleText;
