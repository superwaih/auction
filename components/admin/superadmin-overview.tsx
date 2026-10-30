"use client";

import Link from "next/link";
import { useState } from "react";
import { PasswordInput } from "../password-input";
import { adminFetch, useAdminRole } from "@/lib/client";
import { ghostButtonClass, inputClass } from "../ui";
import { useSuperadminData, type Account, type Draw } from "./superadmin-data";

const panel = "overflow-hidden rounded-lg border border-ink/10 bg-surface";
const action = "inline-flex min-h-10 items-center justify-center rounded-md border border-ink/15 bg-surface px-4 text-sm font-medium hover:bg-canvas disabled:opacity-50";
const field = "h-10 w-full rounded-md border border-ink/15 bg-surface px-3 text-sm outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt";
const titles = { overview: ["Overview", "Monitor draws, participation and your admin team."], admins: ["Admin accounts", "Manage the people running draws on Kivos."], draws: ["All draws", "Find and manage draws across every admin account."] };

export function SuperadminOverview({ view = "overview" }: { view?: "overview" | "admins" | "draws" }) {
  const role = useAdminRole();
  const { data, error, refreshing, reload } = useSuperadminData();
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  if (role !== "superadmin") return <p className="py-12">This page is for the superadmin. <Link className="underline" href="/admin">Go to your draws</Link>.</p>;
  const draws = data?.listings.filter((draw) => (!filter || draw.adminId === filter) && (!status || draw.status === status) && `${draw.name} ${draw.adminName}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const admins = data?.admins.filter((admin) => `${admin.name} ${admin.username}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-[-0.025em]">{titles[view][0]}</h1><p className="mt-1 text-sm text-muted">{titles[view][1]}</p></div>
        <div className="flex gap-2"><button className={action} disabled={refreshing} onClick={reload}>{refreshing ? "Refreshing…" : "Refresh"}</button><Link href="/admin/new" className="inline-flex min-h-10 items-center rounded-md bg-espresso px-4 text-sm font-medium text-white hover:bg-ink">Create draw</Link></div>
      </div>
      {error && <p role="alert" className="rounded-md border border-rose/20 bg-rose-wash p-4 text-sm text-rose">{error} <button onClick={reload} className="ml-2 underline">Try again</button></p>}
      {!data && !error && <div role="status" className={`${panel} p-8 text-sm text-muted`}>Loading dashboard…</div>}
      {data && <>
        {view === "overview" && <>
          <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
            {[["Total draws", data.stats.draws, `${data.stats.live} currently live`, "bg-cobalt-wash text-cobalt-ink"], ["Admin accounts", data.stats.admins, "Across the workspace", "bg-orchid-wash text-orchid-ink"], ["Numbers claimed", data.stats.entries, "All-time entries", "bg-marigold-wash text-marigold-ink"], ["Winners recorded", data.stats.winners, "Across completed draws", "bg-mint-wash text-mint-ink"]].map(([label, value, note, tone]) => <div key={label} className={`rounded-lg p-5 ${tone}`}><dt className="text-xs font-medium">{label}</dt><dd className="mt-3 text-3xl font-medium tabular-nums tracking-[-0.03em]">{Number(value).toLocaleString()}</dd><p className="mt-2 text-xs">{note}</p></div>)}
          </dl>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className={`${panel} p-5`} aria-labelledby="activity-title">
              <div className="flex items-center justify-between"><h2 id="activity-title" className="text-sm font-semibold">Draw activity</h2><span className="text-xs text-muted">All time</span></div>
              <p className="mt-1 text-xs text-muted">{data.stats.draws} total draws by current status</p>
              <div className="mt-7 space-y-6">{[["Live", data.stats.live], ["Scheduled", data.stats.scheduled], ["Closed", data.stats.closed]].map(([label, count]) => <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-4 text-sm"><span className="text-ink-2">{label}</span><div className="h-3 overflow-hidden rounded-sm bg-paper" aria-hidden><div className={`h-full rounded-sm ${label === "Live" ? "bg-mint" : label === "Scheduled" ? "bg-marigold" : "bg-cobalt"}`} style={{ width: `${data.stats.draws ? Number(count) / data.stats.draws * 100 : 0}%` }} /></div><span className="text-right tabular-nums">{Number(count).toLocaleString()}</span></div>)}</div>
            </section>
            <section className={panel} aria-labelledby="team-title">
              <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h2 id="team-title" className="text-sm font-semibold">Admin team</h2><Link className="text-xs text-ink-2 hover:underline" href="/superadmin/admins">View all</Link></div>
              <ul className="divide-y divide-ink/10">{data.admins.slice(0, 4).map((admin) => <li key={admin.id} className="flex items-center justify-between gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{admin.name}</p><p className="text-xs text-muted">{admin.role === "superadmin" ? "Superadmin" : "Admin"}</p></div><span className="shrink-0 text-xs tabular-nums text-muted">{admin.draws} draws</span></li>)}</ul>
              {!data.admins.length && <p className="p-5 text-sm text-muted">No admin accounts yet.</p>}
            </section>
          </div>
          <section className={panel} aria-labelledby="recent-title"><div className="flex items-center justify-between px-5 py-4"><h2 id="recent-title" className="text-sm font-semibold">Recent draws</h2><Link href="/superadmin/draws" className="text-xs text-ink-2 hover:underline">View all draws</Link></div><DrawTable draws={data.listings.slice(0, 6)} /></section>
        </>}
        {view === "admins" && <section className={panel} aria-label="Admin accounts">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 p-5"><p className="text-sm font-medium">{admins.length} accounts</p><input className={`${field} sm:max-w-xs`} aria-label="Search admins" placeholder="Search name or username" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-ink/10 text-xs text-muted"><tr>{["Admin", "Role", "Draws", "Actions"].map((label) => <th key={label} scope="col" className={`px-5 py-3 font-medium ${label === "Draws" ? "text-right" : ""}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-ink/10">{admins.map((admin) => <tr key={admin.id} className="hover:bg-paper"><td className="px-5 py-4"><p className="font-medium">{admin.name}</p><p className="mt-0.5 text-xs text-muted">@{admin.username}</p></td><td className="px-5 py-4 text-ink-2">{admin.role === "superadmin" ? "Superadmin" : "Admin"}</td><td className="px-5 py-4 text-right tabular-nums">{admin.draws}</td><td className="px-5 py-3"><div className="flex flex-wrap items-start gap-4"><Link href={`/admin/new?adminId=${admin.id}`} className="inline-flex min-h-11 items-center text-sm hover:underline">Create draw</Link>{admin.role !== "superadmin" && <ResetPassword account={admin} onSaved={reload} />}</div></td></tr>)}</tbody></table></div>
          {!admins.length && <p className="p-8 text-center text-sm text-muted">No admins match your search.</p>}
        </section>}
        {view === "draws" && <section className={panel} aria-label="All draws">
          <div className="grid gap-3 border-b border-ink/10 p-5 md:grid-cols-[minmax(0,1fr)_180px_160px]"><input className={field} aria-label="Search draws" placeholder="Search draw or admin" value={search} onChange={(e) => setSearch(e.target.value)} /><select className={field} aria-label="Filter by admin" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All admins</option>{data.admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select><select className={field} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="ended">Closed</option></select></div>
          <DrawTable draws={draws} /><div className="border-t border-ink/10 px-5 py-3 text-xs text-muted">Showing {draws.length} of {data.listings.length} draws</div>
        </section>}
        <p className="text-xs text-muted">Last updated {new Date(data.updatedAt).toLocaleTimeString()} · Refreshes every 30 seconds</p>
      </>}
    </div>
  );
}

function DrawTable({ draws }: { draws: Draw[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-y border-ink/10 text-xs text-muted"><tr>{["Draw", "Admin", "Status", "End date", ""].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody className="divide-y divide-ink/10">{draws.map((draw) => <tr key={draw.slug} className="hover:bg-paper"><td className="max-w-[280px] px-5 py-4 font-medium">{draw.name}</td><td className="px-5 py-4 text-ink-2">{draw.adminName}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs ${draw.status === "live" ? "bg-mint-wash text-mint-ink" : draw.status === "scheduled" ? "bg-marigold-wash text-marigold-ink" : "bg-paper text-ink-2"}`}><span className="size-1.5 rounded-full bg-current" aria-hidden />{draw.status === "live" ? "Live" : draw.status === "scheduled" ? "Scheduled" : "Closed"}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-muted">{new Date(draw.endsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}<br />{new Date(draw.endsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td><td className="px-5 py-3 text-right"><Link href={`/admin/listings/${draw.slug}`} className="inline-flex min-h-10 items-center text-xs font-medium hover:underline">Manage</Link></td></tr>)}</tbody></table>{!draws.length && <p className="p-10 text-center text-sm text-muted">No draws to show.</p>}</div>;
}
function ResetPassword({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <div><button className="min-h-11 underline underline-offset-4" onClick={() => { setOpen(!open); setMessage(""); }}>Reset password</button>{open && <form className="mt-2 flex max-w-xs flex-col gap-3" onSubmit={async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setMessage("");
    try {
      const response = await adminFetch(`/api/admin/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: new FormData(form).get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset(); setMessage("Password reset. The admin can sign in with the new password."); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reset password."); }
    finally { setBusy(false); }
  }}><label htmlFor={`reset-${account.id}`}>Temporary password</label><PasswordInput id={`reset-${account.id}`} name="password" autoComplete="new-password" className={inputClass} minLength={8} maxLength={128} required disabled={busy} /><p className="text-xs">Use 8–128 characters. This signs the admin out of all devices.</p><button disabled={busy} className={ghostButtonClass}>{busy ? "Saving…" : "Reset password"}</button></form>}{message && <p role="status" className="mt-2 max-w-xs text-sm">{message}</p>}</div>;
}
