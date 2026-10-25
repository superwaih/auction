"use client";

import { useId, useState } from "react";
import { toLocalInput, useNow } from "@/lib/client";

const MAX_DAYS_AHEAD = 30; // matches the server's scheduling limit
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** The next 5-minute mark at least `leadMin` minutes from now. */
export function suggestedStart(now: number, leadMin = 15) {
  const d = new Date(now + leadMin * 60_000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return d;
}

function describeIn(ms: number) {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `in ${h} h ${m} min` : `in ${h} h`;
  const days = Math.round(h / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * Start-time picker: quick picks, an inline month calendar limited to the next
 * 30 days, and hour/minute selects in 5-minute steps. Reads and writes the same
 * "YYYY-MM-DDTHH:mm" local string a datetime-local input would.
 */
export function DateTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ids = useId();
  const now = useNow(0, 30_000);
  const selected = value ? new Date(value) : null;
  const [view, setView] = useState(() => {
    const base = value ? new Date(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  if (now === null) return <div className="h-96 animate-pulse rounded-[1.5rem] bg-black/[0.04]" aria-hidden />;

  const today = startOfDay(new Date(now));
  const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MAX_DAYS_AHEAD);
  const base = selected ?? suggestedStart(now);

  const emit = (d: Date) => onChange(toLocalInput(d));
  const withDay = (day: Date) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes());
    // Picking today with a time that has already passed moves the time forward.
    emit(d.getTime() <= now ? suggestedStart(now) : d);
  };
  const withTime = (h24: number, m: number) => {
    const d = new Date(base);
    d.setHours(h24, m, 0, 0);
    emit(d);
  };

  const hour24 = base.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const pm = hour24 >= 12;
  const to24 = (h12: number, isPm: boolean) => (h12 % 12) + (isPm ? 12 : 0);

  // Month grid, Monday first.
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= lastDay;

  const tonight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0);
  const tomorrow9 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0);
  const quick = [
    { label: "In 15 min", date: suggestedStart(now, 15) },
    { label: "In 1 hour", date: suggestedStart(now, 60) },
    ...(tonight.getTime() - now > 15 * 60_000 ? [{ label: "Tonight 8 PM", date: tonight }] : []),
    { label: "Tomorrow 9 AM", date: tomorrow9 },
  ];

  const tooSoon = selected !== null && selected.getTime() <= now;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick start times">
        {quick.map((q) => {
          const active = selected?.getTime() === q.date.getTime();
          return (
            <button
              key={q.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                emit(q.date);
                setView(new Date(q.date.getFullYear(), q.date.getMonth(), 1));
              }}
              className={`rounded-full px-3.5 py-2 text-sm transition-all duration-500 ease-spring active:scale-[0.97] ${
                active ? "bg-espresso text-[#fdfbf7]" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07] hover:text-ink"
              }`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] bg-paper p-3 ring-1 ring-black/[0.06] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="font-serif text-xl tracking-[-0.02em] text-ink" aria-live="polite">
            {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <div className="flex gap-1">
            <MonthButton
              label="Previous month"
              disabled={!canPrev}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              d="M10 4L6 8l4 4"
            />
            <MonthButton
              label="Next month"
              disabled={!canNext}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              d="M6 4l4 4-4 4"
            />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Start date">
          {WEEKDAYS.map((w) => (
            <span key={w} className="pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2" aria-hidden>
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} aria-hidden />;
            const disabled = day < today || day > lastDay;
            const isSelected = selected !== null && sameDay(day, selected);
            const isToday = sameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                onClick={() => withDay(day)}
                className={`flex aspect-square min-h-10 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-all duration-300 ease-spring [touch-action:manipulation] active:scale-95 disabled:cursor-default ${
                  isSelected
                    ? "bg-espresso text-white"
                    : disabled
                      ? "text-ink-2/35"
                      : `bg-surface text-ink hover:bg-cobalt-wash hover:text-cobalt-ink ${isToday ? "ring-2 ring-cobalt/60" : ""}`
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="flex flex-wrap items-end gap-1.5">

        <legend className="sr-only">Start time</legend>
        <TimeSelect
          id={`${ids}-h`}
          label="Hour"
          value={hour12}
          options={HOURS_12.map((h) => ({ value: h, label: String(h) }))}
          onChange={(h) => withTime(to24(h, pm), base.getMinutes())}
        />
        <span className="pb-3 font-serif text-xl text-ink" aria-hidden>
          :
        </span>
        <TimeSelect
          id={`${ids}-m`}
          label="Minute"
          value={base.getMinutes() - (base.getMinutes() % 5)}
          options={MINUTES.map((m) => ({ value: m, label: String(m).padStart(2, "0") }))}
          onChange={(m) => withTime(hour24, m)}
        />
        <div className="relative grid grid-cols-2 rounded-full bg-black/[0.045] p-1 ring-1 ring-black/[0.04]">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-[0_1px_2px_rgba(42,33,28,0.08)] transition-transform duration-500 ease-spring ${
              pm ? "translate-x-full" : ""
            }`}
          />
          {[false, true].map((isPm) => (
            <button
              key={String(isPm)}
              type="button"
              aria-pressed={pm === isPm}
              onClick={() => withTime(to24(hour12, isPm), base.getMinutes())}
              className={`relative min-h-10 rounded-full px-3.5 text-sm font-medium transition-colors duration-500 ease-spring ${
                pm === isPm ? "text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {isPm ? "PM" : "AM"}
            </button>
          ))}
        </div>
      </fieldset>

      <p
        className={`rounded-2xl px-4 py-3 text-sm ${tooSoon ? "bg-tomato-wash text-tomato-ink" : selected ? "bg-cobalt-wash text-cobalt-ink" : "bg-black/[0.04] text-ink-2"}`}
        aria-live="polite"
      >
        {!selected
          ? "Pick a day and time, or tap a quick pick."
          : tooSoon
            ? "That time has passed. Pick a later one."
            : `Starts ${selected.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${selected.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })} · ${describeIn(selected.getTime() - now)}`}
      </p>
    </div>
  );
}

function MonthButton({ label, disabled, onClick, d }: { label: string; disabled: boolean; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-black/[0.06] transition-all duration-300 ease-spring hover:bg-black/[0.04] active:scale-95 disabled:opacity-30"
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden>
        <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function TimeSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-h-11 w-[4.25rem] appearance-none rounded-2xl bg-paper py-2 pl-3.5 pr-7 text-base font-medium tabular-nums text-ink ring-1 ring-black/[0.08] transition-all duration-300 ease-spring focus:bg-surface focus:outline-none focus:ring-2 focus:ring-cobalt"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-2" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
