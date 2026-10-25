"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/client";
import { hueForNumber } from "@/lib/colors";
import { Reveal } from "../reveal";
import { Shell } from "../ui";
import { AdminListingHeader, AdminListingMissing, adminListingSkeleton, useAdminListing } from "./listing-header";

type Entrant = { number: number; name: string; pickedAt: string };

/** Entrants tab: every pick with its name. Visible to the admin even while the public board hides names. */
export function AdminEntrants({ slug }: { slug: string }) {
  const { listing, missing, reload } = useAdminListing(slug);
  const [entrants, setEntrants] = useState<Entrant[] | null>(null);
  const [sort, setSort] = useState<"number" | "time">("number");

  useEffect(() => {
    const load = () =>
      adminFetch(`/api/admin/listings/${slug}/entrants`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((next: Entrant[]) => setEntrants(next), () => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [slug]);

  if (missing) return <AdminListingMissing />;
  if (!listing) return adminListingSkeleton;

  const winners = new Map(listing.winners.map((w, i) => [w.number, i + 1]));
  const rows = [...(entrants ?? [])].sort((a, b) =>
    sort === "number" ? a.number - b.number : a.pickedAt.localeCompare(b.pickedAt),
  );

  return (
    <div className="flex flex-col gap-8">
      <AdminListingHeader listing={listing} tab="entrants" onChanged={reload} />

      <Reveal>
        <Shell innerClassName="p-2 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-3 sm:px-4">
            <p className="text-ink-2">
              <span className="font-semibold text-ink">{entrants?.length ?? "…"}</span> of {listing.slots} numbers taken
            </p>
            <div className="flex gap-1 rounded-full bg-black/[0.045] p-1" role="group" aria-label="Sort entrants">
              {(["number", "time"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sort === s}
                  onClick={() => setSort(s)}
                  className={`min-h-9 rounded-full px-4 text-sm font-medium ${sort === s ? "bg-surface text-ink" : "text-ink-2 hover:text-ink"}`}
                >
                  {s === "number" ? "By number" : "By time"}
                </button>
              ))}
            </div>
          </div>

          {entrants === null ? (
            <div className="m-3 h-40 animate-pulse rounded-2xl bg-black/[0.04]" />
          ) : rows.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-ink-2">Nobody has picked a number yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-ink-2">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold sm:px-4">Number</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Name</th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">Picked</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold sm:px-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const hue = hueForNumber(e.number);
                  const place = winners.get(e.number);
                  return (
                    <tr key={e.number} className="border-t border-black/[0.05]">
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className="inline-flex size-9 items-center justify-center rounded-xl font-semibold tabular-nums"
                          style={{ background: hue.solid, color: hue.on }}
                        >
                          {e.number}
                        </span>
                      </td>
                      <td className="max-w-40 truncate px-3 py-2.5 font-medium text-ink">{e.name}</td>
                      <td className="hidden px-3 py-2.5 tabular-nums text-ink-2 sm:table-cell">
                        {new Date(e.pickedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5 text-right sm:px-4">
                        {place ? (
                          <span className="rounded-full bg-mint-wash px-2.5 py-1 text-xs font-semibold text-mint-ink">
                            {listing.winners.length > 1 ? `Winner #${place}` : "Winner"}
                          </span>
                        ) : (
                          <span className="text-ink-2">{listing.status === "ended" ? "—" : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Shell>
      </Reveal>
    </div>
  );
}
