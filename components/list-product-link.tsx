"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Every "List a product" button goes through here. On the landing page a plain
 * /#list link does nothing once the URL already ends in #list, so we scroll to
 * the form ourselves.
 */
export function ListProductLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href="/#list"
      className={className}
      onClick={(e) => {
        if (pathname !== "/") return;
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
