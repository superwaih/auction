import Link from "next/link";
import { CreateListing } from "@/components/create-listing";
import { LiveListings } from "@/components/live-listings";
import { Reveal } from "@/components/reveal";
import { SiteNav } from "@/components/site-nav";
import { ArrowBadge, Eyebrow, Shell, SiteFooter, buttonClass } from "@/components/ui";
import { hueForNumber } from "@/lib/colors";

export default function Home() {
  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* The form comes first: top of the page on phones, left column on desktop, with the promise beside it. */}
        <section className="grid items-start gap-12 pb-20 pt-2 md:grid-cols-12 md:gap-10 md:pb-40 md:pt-12">
          <Reveal className="md:col-span-6 lg:col-span-5">
            <Shell innerClassName="p-5 sm:p-9" id="list" className="scroll-mt-28 ring-cobalt/15">
              <div className="mb-6 flex flex-col items-start gap-4 sm:mb-8">
                <Eyebrow tone="cobalt">For sellers</Eyebrow>
                <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">
                  List a product
                </h1>
                <p className="text-ink-2">Name it, set the countdown, and share the link or QR code.</p>
              </div>
              <CreateListing />
            </Shell>
          </Reveal>

          <div className="md:sticky md:top-32 md:col-span-6 md:pt-6 lg:col-span-7 lg:pl-6">
            <Reveal index={1}>
              <Eyebrow tone="mint">
                <span className="breathe size-1.5 rounded-full bg-current" aria-hidden />
                Live product draws
              </Eyebrow>
            </Reveal>
            <Reveal index={2}>
              <h2 className="mt-6 font-serif text-[clamp(3rem,12vw,7rem)] font-light leading-[0.94] tracking-[-0.05em] text-ink sm:mt-8">
                Fifty numbers. <span className="text-tomato">One winner.</span>
              </h2>
            </Reveal>
            <Reveal index={3}>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-2 sm:mt-10 sm:text-lg">
                Everyone picks a number from 1 to 50, and when the countdown ends, one of the picked numbers takes it
                home.
              </p>
            </Reveal>
            <Reveal index={4} className="mt-8 sm:mt-10">
              <Link href="/live" className={`${buttonClass} justify-between max-sm:w-full`}>
                See live draws
                <ArrowBadge />
              </Link>
            </Reveal>
            <Reveal index={5}>
              <BoardPreview />
            </Reveal>
          </div>
        </section>

        <LiveListings variant="preview" />

        <section id="how" aria-labelledby="how-heading" className="scroll-mt-28 py-20 md:py-40">
          <Reveal className="mb-8 flex flex-col items-start gap-5 md:mb-14">
            <Eyebrow tone="orchid">The rules</Eyebrow>
            <h2
              id="how-heading"
              className="max-w-2xl font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1] tracking-[-0.045em] text-ink"
            >
              How a draw works
            </h2>
          </Reveal>
          {/* Asymmetrical bento: one tall card carrying the board, two stacked rules beside it. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:grid-rows-2">
            <Reveal className="md:col-span-7 md:row-span-2">
              <Shell innerClassName="flex flex-col justify-between gap-10 p-8 sm:p-10">
                <div>
                  <h3 className="font-serif text-3xl font-light tracking-[-0.03em] text-ink">One number each</h3>
                  <p className="mt-3 max-w-sm text-ink-2">
                    Every number from 1 to 50 can be claimed once. Whoever picks it first keeps it, and each person
                    holds one number per draw.
                  </p>
                </div>
                <MiniBoard />
              </Shell>
            </Reveal>
            <Reveal index={1} className="md:col-span-5">
              <Shell plate="bg-cobalt text-white" innerClassName="p-8 sm:p-10">
                <h3 className="font-serif text-3xl font-light tracking-[-0.03em]">Locked when live</h3>
                <p className="mt-3 text-white/90">
                  Sellers can edit until the countdown starts. After that the name, photo and timing are fixed for
                  everyone.
                </p>
              </Shell>
            </Reveal>
            <Reveal index={2} className="md:col-span-5">
              <Shell plate="bg-marigold text-ink" innerClassName="p-8 sm:p-10">
                <h3 className="font-serif text-3xl font-light tracking-[-0.03em]">Drawn at zero</h3>
                <p className="mt-3 text-ink/85">
                  When the clock runs out, one claimed number is drawn at random and shown to everyone on the board.
                </p>
              </Shell>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** The 50-number board in miniature: a few claimed, one drawn. */
function BoardPreview() {
  const claimed = new Set([3, 7, 18, 21, 26, 34, 41, 47]);
  return (
    <div className="mt-10 grid max-w-lg grid-cols-10 gap-1 sm:gap-1.5 md:mt-16" aria-hidden>
      {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => {
        const hue = hueForNumber(n);
        const style =
          n === 13
            ? { background: hue.solid, color: hue.on, boxShadow: `0 0 0 4px ${hue.wash}` }
            : claimed.has(n)
              ? { background: hue.solid, color: hue.on, opacity: 0.55 }
              : { background: hue.wash, color: hue.ink };
        return (
          <span
            key={n}
            className="flex aspect-square items-center justify-center rounded-lg text-[10px] font-semibold tabular-nums sm:rounded-xl sm:text-xs"
            style={style}
          >
            {n}
          </span>
        );
      })}
    </div>
  );
}

function MiniBoard() {
  const taken = [2, 5, 9, 13, 14, 22, 30];
  return (
    <div className="grid grid-cols-10 gap-1.5" aria-hidden>
      {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium tabular-nums ${
            n === 13 ? "bg-tomato text-ink" : taken.includes(n) ? "bg-black/[0.08] text-ink-2 line-through" : "bg-orchid-wash text-orchid-ink"
          }`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}
