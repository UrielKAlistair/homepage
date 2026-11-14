// The visitor asked their system for less motion: animations are skipped, not slowed
export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
