import { useEffect, useRef, useState, ReactNode } from "react";

interface SlideInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
}

const SlideIn = ({
  children,
  delay = 0,
  className = "",
  duration = 1000,
  threshold = 0.55,
}: SlideInProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const target = wrapperRef.current;
    if (!target || hasAnimated) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutId = setTimeout(() => {
            setHasAnimated(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [delay, hasAnimated, threshold]);

  return (
    <div ref={wrapperRef} className="relative overflow-hidden">
      <div
        style={{ transitionDuration: `${duration}ms` }}
        className={`
          transition-transform transition-opacity ease-out
          will-change-transform
          ${hasAnimated
            ? "translate-y-0 opacity-100"
            : "translate-y-[110%] opacity-0"
          }
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default SlideIn;
