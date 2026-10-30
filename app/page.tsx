import Link from "next/link";
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
        {/* Editorial split: the promise on the left, the board it describes on the right. */}
        <section className="grid items-center gap-10 pb-20 pt-4 md:grid-cols-12 md:gap-10 md:pb-32 md:pt-16">
          <div className="md:col-span-7">
            <Reveal>
              <Eyebrow tone="mint">
                <span className="breathe size-1.5 rounded-full bg-current" aria-hidden />
                Live draws
              </Eyebrow>
            </Reveal>
            <Reveal index={1}>
              <h1 className="mt-6 font-serif text-[clamp(3rem,11vw,7rem)] font-light leading-[0.94] tracking-[-0.05em] text-ink sm:mt-8">
                Pick a number. <span className="text-tomato">Take it home.</span>
              </h1>
            </Reveal>
            <Reveal index={2}>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-2 sm:mt-10 sm:text-lg">
                Every draw has a board of numbers and a countdown. Claim one before the clock hits zero, and if your
                number is drawn, the prize is yours.
              </p>
            </Reveal>
            <Reveal index={3} className="mt-8 sm:mt-10">
              <Link href="/live" className={`${buttonClass} justify-between max-sm:w-full`}>
                See live draws
                <ArrowBadge />
              </Link>
            </Reveal>
          </div>
          <Reveal index={2} className="md:col-span-5">
            <BoardPreview />
          </Reveal>
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
                    Every number on the board can be claimed once. Whoever picks it first keeps it, and each person
                    holds one number per draw.
                  </p>
                </div>
                <MiniBoard />
              </Shell>
            </Reveal>
            <Reveal index={1} className="md:col-span-5">
              <Shell plate="bg-cobalt text-white" innerClassName="p-8 sm:p-10">
                <h3 className="font-serif text-3xl font-light tracking-[-0.03em]">Know your draw</h3>
                <p className="mt-3 text-white/90">
                  Check the prize, countdown and number of winners before you pick. Organisers can extend the clock
                  or close a live draw early, so keep an eye on the draw page.
                </p>
              </Shell>
            </Reveal>
            <Reveal index={2} className="md:col-span-5">
              <Shell plate="bg-marigold text-ink" innerClassName="p-8 sm:p-10">
                <h3 className="font-serif text-3xl font-light tracking-[-0.03em]">Drawn at zero</h3>
                <p className="mt-3 text-ink/85">
                  When the clock runs out, the winning numbers are drawn at random from the ones people claimed.
                  Some draws have one winner, some have several.
                </p>
              </Shell>
            </Reveal>
          </div>
        </section>
        <section aria-labelledby="states-heading" className="bg-mint-wash px-6 py-12 sm:px-10 md:grid md:grid-cols-12 md:gap-16 md:py-20">
          <Reveal className="md:col-span-5">
            <h2 id="states-heading" className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-none tracking-[-0.045em] text-ink">
              Follow the countdown
            </h2>
            <p className="mt-6 max-w-sm text-ink">
              Every draw has its own page. Come back to the same link to pick your number, watch the clock and see the result.
            </p>
          </Reveal>
          <dl className="mt-10 space-y-8 text-ink md:col-span-7 md:mt-0">
            {[
              ["Scheduled", "Check the start time and prize details. The board opens for picks when the draw goes live."],
              ["Live", "Choose an available number and add your name. Taken numbers are marked on the board as people join."],
              ["Closed", "Open the draw to see the winning numbers and names. Only numbers that were claimed enter the draw."],
            ].map(([title, description]) => (
              <div key={title} className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:gap-6">
                <dt className="font-serif text-2xl tracking-[-0.03em]">{title}</dt>
                <dd className="max-w-md">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-28 py-20 md:grid md:grid-cols-12 md:gap-16 md:py-40">
          <Reveal className="md:col-span-5">
            <h2 id="faq-heading" className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-none tracking-[-0.045em] text-ink">
              Before you pick
            </h2>
            <p className="mt-6 max-w-xs">A few things to know before putting your name on the board.</p>
          </Reveal>
          <div className="mt-8 space-y-3 md:col-span-7 md:mt-0">
            {[
              ["Do I need an account?", "No account is needed to pick. Enter your name and choose an available number. Kivos remembers your pick in this browser, so return on the same device and browser to see your number."],
              ["Can I choose more than one number?", "Each person holds one number per draw. Once your pick is confirmed, it stays yours for that draw. You can join other live draws too."],
              ["What if someone takes my number first?", "A number can only belong to one entrant. If another person confirms it first, you’ll be asked to choose a different available number."],
              ["How are winners chosen?", "When a draw closes, winning numbers are selected at random from the claimed numbers. Each draw shows how many winners it has; unclaimed numbers are never selected."],
              ["Where can I see the results?", "Return to the draw’s page after it closes to see the winning numbers and names. If nobody picked a number, the draw ends without a winner."],
            ].map(([question, answer]) => (
              <details key={question} className="group bg-paper px-5 py-1 text-ink sm:px-6">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {question}
                  <span aria-hidden className="text-2xl font-light group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-lg pb-5 leading-relaxed">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="join-heading" className="flex flex-col items-start justify-between gap-8 bg-marigold px-6 py-12 sm:px-10 md:flex-row md:items-center md:py-16">
          <div>
            <h2 id="join-heading" className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-none tracking-[-0.045em] text-ink">Find your number</h2>
            <p className="mt-6 max-w-md text-ink">See what’s live, find a prize you’d love and claim a spot on the board.</p>
          </div>
          <Link href="/live" className={`${buttonClass} shrink-0`}>
            See live draws <ArrowBadge />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** A board in miniature: a few claimed, one drawn. */
function BoardPreview() {
  const claimed = new Set([3, 7, 18, 21, 26, 34, 41, 47]);
  return (
    <div className="grid w-full grid-cols-10 gap-1 sm:gap-1.5" aria-hidden>
      {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => {
        const hue = hueForNumber(n);
        const style =
          n === 13
            ? { background: hue.solid, color: hue.on, boxShadow: `0 0 0 4px ${hue.wash}` }
            : claimed.has(n)
              ? { background: "#5b534d", color: "rgba(253,251,247,0.55)" }
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
            n === 13
              ? "bg-tomato text-ink"
              : taken.includes(n)
                ? "bg-[#5b534d] text-[#fdfbf7]/55 line-through"
                : "bg-orchid-wash text-orchid-ink"
          }`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}
