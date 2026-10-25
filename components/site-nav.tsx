"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/client";
import { HUES } from "@/lib/colors";
import { ListProductLink } from "./list-product-link";
import { ProfileLink } from "./profile-link";
import { ArrowBadge, buttonClass } from "./ui";

/**
 * Floating island nav. Live and List a product stay in the bar at every width,
 * since most visitors arrive on a phone. The bar firms up once the page scrolls.
 * Pages pass `current` for the active link (usePathname would block prerendering).
 */
export function SiteNav({ current }: { current?: "live" | "me" }) {
  const profile = useProfile();
  const hasProfile = Boolean(profile.name || profile.listings.length);
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
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
        <nav
          aria-label="Main"
          className={`flex w-full max-w-4xl items-center gap-1 rounded-full p-1.5 pl-3 ring-1 backdrop-blur-xl transition-all duration-700 ease-spring sm:gap-2 sm:pl-4 ${
            scrolled
              ? "bg-[#fdfbf7]/92 shadow-[0_12px_32px_-16px_rgba(42,33,28,0.28)] ring-black/[0.08]"
              : "bg-[#fdfbf7]/70 ring-black/[0.05]"
          }`}
        >
          <Link href="/" className="group mr-auto flex items-center gap-2.5 rounded-full py-1 pr-2" aria-label="Alfreed home">
            <LogoMark />
            {/* On phones the wordmark yields to the profile button; the logo mark keeps the brand. */}
            <span
              className={`font-serif text-[1.35rem] leading-none tracking-[-0.03em] text-ink max-[359px]:hidden ${
                hasProfile ? "max-sm:hidden" : ""
              }`}
            >
              Alfreed
            </span>
          </Link>

          <NavLink href="/live" active={current === "live"}>
            <span className="breathe size-1.5 rounded-full bg-mint" aria-hidden />
            <span className="sm:hidden">Live</span>
            <span className="hidden sm:inline">Live draws</span>
          </NavLink>
          <NavLink href="/#how" active={false} className="hidden md:flex">
            How it works
          </NavLink>
          {hasProfile && (
            <NavLink href="/me" active={current === "me"} className="hidden md:flex">
              My listings
            </NavLink>
          )}

          <span className="mx-1 hidden h-6 w-px bg-black/[0.08] md:block" aria-hidden />

          <ListProductLink
            className={`${buttonClass} min-h-10 whitespace-nowrap px-4 py-1 text-sm sm:py-1.5 sm:pl-5 sm:pr-1.5`}
          >
            List a product
            <span className="hidden sm:contents">
              <ArrowBadge />
            </span>
          </ListProductLink>
          <ProfileLink active={current === "me"} />
        </nav>
      </header>
    </>
  );
}

function NavLink({
  href,
  active,
  className = "flex",
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors duration-500 ease-spring sm:px-4 ${
        active ? "bg-espresso/[0.07] text-ink" : "text-ink-2 hover:bg-black/[0.05] hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/** Six tiles, one per hue: the board in miniature. One tile lifts on hover, like a drawn number. */
function LogoMark() {
  return (
    <span className="grid size-7 shrink-0 grid-cols-3 gap-[2px] rounded-[0.55rem] bg-surface p-[3px] ring-1 ring-black/[0.06]" aria-hidden>
      {HUES.map((h, i) => (
        <span
          key={h.name}
          className={`rounded-[3px] transition-transform duration-500 ease-spring ${i === 4 ? "group-hover:-translate-y-[2px] group-hover:scale-110" : ""}`}
          style={{ background: h.solid }}
        />
      ))}
    </span>
  );
}
