import { HUES, hueFor } from "@/lib/colors";
import type { ListingStatus } from "@/lib/types";

/** Primary pill. Pair with <ArrowBadge /> for the nested trailing icon. */
export const buttonClass =
  "group inline-flex items-center justify-center gap-3 rounded-full bg-espresso py-2 pl-6 pr-2 text-[15px] font-medium text-[#fdfbf7] transition-all duration-500 ease-spring hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100";

export const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-black/[0.05] px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-black/5 transition-all duration-500 ease-spring hover:bg-black/[0.08] active:scale-[0.98] disabled:opacity-40";

export const inputClass =
  // 16px text: anything smaller makes iOS Safari zoom the page on focus.
  "w-full rounded-2xl bg-paper px-4 py-3 text-base text-ink ring-1 ring-black/[0.08] placeholder:text-muted transition-all duration-500 ease-spring focus:bg-surface focus:outline-none focus:ring-2 focus:ring-cobalt";

export const labelClass = "text-[13px] font-medium text-ink";

export function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4.5 11.5l7-7M5.5 4.5h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The button-in-button: the arrow sits in its own marigold circle, flush right. */
export function ArrowBadge() {
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-marigold text-ink transition-transform duration-500 ease-spring group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105">
      <ArrowIcon />
    </span>
  );
}

/** Double-bezel enclosure: a tinted tray holding a plate with concentric corners. */
export function Shell({
  children,
  className = "",
  innerClassName = "",
  plate = "bg-surface",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Background (and text colour, if needed) of the inner plate. */
  plate?: string;
  as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`rounded-[2rem] bg-black/[0.035] p-1.5 ring-1 ring-black/[0.05] ${className}`} {...rest}>
      <div
        className={`h-full rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_24px_48px_-32px_rgba(42,33,28,0.22)] ${plate} ${innerClassName}`}
      >
        {children}
      </div>
    </Tag>
  );
}

type Tone = "plain" | "sage" | (typeof HUES)[number]["name"];

// Dark ink on a pale wash keeps every tone legible.
const toneClass: Record<Tone, string> = {
  plain: "bg-black/[0.06] text-ink-2",
  sage: "bg-mint-wash text-mint-ink",
  tomato: "bg-tomato-wash text-tomato-ink",
  marigold: "bg-marigold-wash text-marigold-ink",
  cobalt: "bg-cobalt-wash text-cobalt-ink",
  mint: "bg-mint-wash text-mint-ink",
  orchid: "bg-orchid-wash text-orchid-ink",
  sky: "bg-sky-wash text-sky-ink",
};

export function Eyebrow({ children, tone = "plain" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

const statusStyle: Record<ListingStatus, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "mint" },
  scheduled: { label: "Opens soon", tone: "marigold" },
  ended: { label: "Closed", tone: "plain" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = statusStyle[status];
  return (
    <Eyebrow tone={s.tone}>
      {status === "live" && <span className="breathe size-1.5 rounded-full bg-current" aria-hidden />}
      {s.label}
    </Eyebrow>
  );
}

const WORDMARK = "Alfreed";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl overflow-hidden px-4 pb-10 pt-20 sm:px-6 md:pt-32">
      <p
        className="font-serif text-[clamp(4rem,22vw,14rem)] font-light leading-[0.85] tracking-[-0.05em]"
        aria-label={WORDMARK}
      >
        {WORDMARK.split("").map((ch, i) => (
          <span key={i} aria-hidden style={{ color: HUES[i % HUES.length].solid }}>
            {ch}
          </span>
        ))}
      </p>
      <div className="mt-8 flex flex-col justify-between gap-2 text-sm text-ink-2 sm:flex-row">
        <p>Fifty numbers, one countdown, one winner.</p>
        <p>Every draw is picked at random from the numbers people claimed.</p>
      </div>
    </footer>
  );
}

/** Stand-in when a listing has no photo: its initial on the listing's own colour. */
export function ImageFallback({ name, colorKey, className = "" }: { name: string; colorKey?: string; className?: string }) {
  const hue = hueFor(colorKey ?? name);
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: hue.solid, color: hue.on }} aria-hidden>
      <span className="font-serif text-[clamp(4rem,12vw,8rem)] font-light leading-none tracking-[-0.05em]">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
