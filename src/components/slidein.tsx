import { useEffect, useRef, useState, ReactNode } from "react";

interface SlideInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
}

const SlideIn = ({
  children,
  delay = 0,
  className = "",
  threshold = 0.45,
}: SlideInProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const target = wrapperRef.current;
    if (!target || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setHasAnimated(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasAnimated, threshold, delay]);

  return (
    <div ref={wrapperRef} className="relative overflow-hidden">
      <div
        className={`
          transition-transform transition-opacity duration-700 ease-out
          will-change-transform
          ${
            hasAnimated
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
