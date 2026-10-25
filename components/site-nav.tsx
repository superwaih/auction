"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowBadge, buttonClass } from "./ui";

/**
 * Floating island nav for the public site. Listing products happens in the
 * admin area, so the bar only leads to the draws. Its background firms up once
 * the page scrolls.
 */
export function SiteNav() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Watch a marker at the top of the page instead of listening to every scroll event.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className="h-20 sm:h-24" aria-hidden />
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-4 sm:pt-5">
        <nav
          className={`flex w-full items-center gap-1 rounded-full p-1.5 pl-4 ring-1 backdrop-blur-xl transition-[background-color,box-shadow] duration-700 ease-spring sm:w-max sm:gap-2 sm:pl-5 ${
            scrolled
              ? "bg-[#fdfbf7]/92 shadow-[0_12px_32px_-16px_rgba(42,33,28,0.28)] ring-black/[0.08]"
              : "bg-[#fdfbf7]/70 ring-black/[0.05]"
          }`}
        >
          <Link href="/" className="mr-auto shrink-0 font-serif text-xl tracking-[-0.03em] text-ink sm:mr-4">
            Alfreed
          </Link>
          {/* On the narrowest phones (under 380px) the bar keeps just the wordmark and Live draws. */}
          <Link
            href="/#how"
            className="flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm text-ink-2 transition-colors duration-500 ease-spring hover:bg-black/[0.05] hover:text-ink max-[379px]:hidden sm:px-4"
          >
            How it works
          </Link>
          <Link
            href="/live"
            className={`${buttonClass} min-h-10 shrink-0 whitespace-nowrap px-4 py-1 text-sm sm:ml-2 sm:py-1.5 sm:pl-5 sm:pr-1.5`}
          >
            <span className="breathe size-1.5 rounded-full bg-mint" aria-hidden />
            Live draws
            <span className="hidden sm:contents">
              <ArrowBadge />
            </span>
          </Link>
        </nav>
      </header>
    </>
  );
}
