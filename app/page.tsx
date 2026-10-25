import { CreateListing } from "@/components/create-listing";
import { LiveListings } from "@/components/live-listings";
import { SiteFooter, SiteHeader } from "@/components/ui";

const rules = [
  {
    title: "One number each",
    body: "Every number from 1 to 50 can be claimed once. First to pick it keeps it.",
  },
  {
    title: "Locked when live",
    body: "Owners can edit until the countdown starts. After that, nothing changes.",
  },
  {
    title: "Drawn at zero",
    body: "When time runs out, one claimed number is drawn at random and shown to everyone.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader>
        <a href="#live" className="transition hover:text-ink">
          Live draws
        </a>
        <a href="#list" className="hidden transition hover:text-ink sm:inline">
          List a product
        </a>
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl px-6">
        <section className="grid items-start gap-12 pb-24 pt-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-20">
          <div className="reveal md:sticky md:top-12">
            <h1 className="font-serif text-[clamp(2.75rem,7vw,5.25rem)] leading-[1.02] tracking-[-0.04em] text-ink">
              Fifty numbers. One winner.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-2">
              List a product and share the link. Everyone picks a number from 1 to 50, and when the countdown
              ends, one of the picked numbers takes it home.
            </p>
            <NumberStrip />
          </div>

          <div
            id="list"
            className="reveal scroll-mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8"
            style={{ "--index": 1 } as React.CSSProperties}
          >
            <h2 className="mb-6 font-serif text-2xl tracking-[-0.02em] text-ink">List a product</h2>
            <CreateListing />
          </div>
        </section>

        <LiveListings />

        <section aria-labelledby="rules-heading" className="pt-24">
          <h2 id="rules-heading" className="mb-8 font-serif text-3xl leading-[1.1] tracking-[-0.03em] text-ink">
            How a draw works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {rules.map((r, i) => (
              <div
                key={r.title}
                className="reveal rounded-xl border border-line bg-surface p-7"
                style={{ "--index": i } as React.CSSProperties}
              >
                <h3 className="text-[17px] font-medium text-ink">{r.title}</h3>
                <p className="mt-2 text-ink-2">{r.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** A quiet preview of the 50-number board: a few claimed, one drawn. */
function NumberStrip() {
  const claimed = new Set([3, 7, 13, 18, 21, 26, 34, 41, 47]);
  return (
    <div className="mt-12 hidden max-w-md grid-cols-10 gap-1.5 md:grid" aria-hidden>
      {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={`flex aspect-square items-center justify-center rounded-md text-xs tabular-nums ${
            n === 13
              ? "bg-ink text-white"
              : claimed.has(n)
                ? "bg-[#e9e8e3] text-ink-2"
                : "border border-line bg-surface/70 text-muted"
          }`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}
