"use client";

import { useEffect, useRef } from "react";

/**
 * Fade-up entrance. CSS plays it on load, so content shows even before (or without)
 * JavaScript. Once hydrated, sections still below the fold are held back and replay
 * the entrance the first time they scroll into view.
 */
export function Reveal({
  children,
  index = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.wait = "";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          delete el.dataset.wait;
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`}
      style={{ "--index": index } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
