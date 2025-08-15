import { useEffect, useRef, useState } from "react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Props {
  text: string;
  className?: string;
  visibleMask: boolean[];
}

const ScrambleText = ({ text, visibleMask, className = "" }: Props) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!visibleMask[3]) return;

    el.dataset.value = text;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let iteration = 0;
          let interval: ReturnType<typeof setInterval> | null = null;

          interval = setInterval(() => {
            if (!el.dataset.value) return;

            setDisplayText(prev =>
              prev.split("").map((_, index) => {
                if (index**3 < iteration**2 || text[index] === " ") {
                  return text[index];
                }
                return letters[Math.floor(Math.random() * letters.length)];
              }).join("")
            );

            if (el.dataset.value.length**3 <= iteration**2) {
              clearInterval(interval!);
            }
            iteration += 1;
          }, 40);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [text,visibleMask[3]]);

  return (
    <h1 ref={ref} className={className} style={{ gap: "0.05em" }}>
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
