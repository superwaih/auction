import Link from "next/link";
import type { ListingStatus } from "@/lib/types";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-[#333] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";

export const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-2 active:scale-[0.98] disabled:opacity-40";

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-ink focus:outline-none";

const statusStyle: Record<ListingStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-green-bg text-green" },
  scheduled: { label: "Starts soon", cls: "bg-yellow-bg text-yellow" },
  ended: { label: "Drawn", cls: "bg-blue-bg text-blue" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = statusStyle[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] ${s.cls}`}
    >
      {status === "live" && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {s.label}
    </span>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="font-serif text-2xl tracking-[-0.03em] text-ink">
      Fifty
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Wordmark />
      <nav className="flex items-center gap-6 text-sm text-muted">{children}</nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-6 pb-10 pt-24">
      <div className="flex flex-col justify-between gap-4 border-t border-line pt-8 text-sm text-muted sm:flex-row">
        <p className="font-serif text-xl tracking-[-0.02em] text-ink">Fifty</p>
        <p>Fifty numbers, one countdown, one winner.</p>
      </div>
    </footer>
  );
}

/** Stand-in when a listing has no photo: its initial, set large. */
export function ImageFallback({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-surface-2 font-serif text-ink/80 ${className}`}
      aria-hidden
    >
      <span className="text-[clamp(3rem,10vw,6rem)] leading-none tracking-[-0.04em]">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
