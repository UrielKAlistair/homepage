import { useEffect, useRef} from "react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Props {
  text: string;
  className?: string;
}

const ScrambleText = ({ text, className = "" }: Props) => {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {

          el.dataset.value = text;

          let iteration = 0;
          let interval: ReturnType<typeof setInterval> | null = null;

          interval = setInterval(() => {
            if (!el.dataset.value) return;

            el.innerText = el.innerText
              .split("")
              .map((letter, index) => {
                if (index < iteration || letter === " ") {
                  return el.dataset.value![index];
                }
                return letters[Math.floor(Math.random() * 26)];
              })
              .join("");

            if (iteration >= el.dataset.value.length) {
              clearInterval(interval!);
            }

            iteration += 1 / 3;
          }, 30);
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <h1 ref={ref} className={className}>
      {text}
    </h1>
  );
};

export default ScrambleText;
