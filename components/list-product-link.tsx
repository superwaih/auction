"use client";

import Link from "next/link";

/**
 * Every "List a product" button goes through here. On the landing page a plain
 * /#list link does nothing once the URL already ends in #list, so we scroll to
 * the form ourselves.
 */
export function ListProductLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link
      href="/#list"
      className={className}
      onClick={(e) => {
        // Read at click time, not via usePathname: that hook blocks prerendering on dynamic routes.
        if (window.location.pathname !== "/") return;
        const form = document.getElementById("list");
        if (!form) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Land the card just below the floating nav (about 96px tall with its margin).
        const top = Math.max(0, form.getBoundingClientRect().top + window.scrollY - 96);
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
        // No auto-focus: it cancels the smooth scroll in Chrome and pops the keyboard on phones.
        history.replaceState(null, "", "/#list");
      }}
    >
      {children}
    </Link>
  );
}
