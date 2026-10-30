"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, useAdminName, useAdminRole } from "@/lib/client";
import { ListingForm } from "../listing-form";
import { Reveal } from "../reveal";
import { Eyebrow, Shell, inputClass } from "../ui";

export function AdminNewListing() {
  const router = useRouter();
  const admin = useAdminName();
  const role = useAdminRole();
  const [accounts, setAccounts] = useState<{ id: string; name: string; username: string }[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (role !== "superadmin") return;
    adminFetch("/api/admin/overview").then(async (res) => {
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setAccounts(result.admins);
      setOwnerId(new URLSearchParams(window.location.search).get("adminId") ?? "");
    }).catch((error) => setError(error.message));
  }, [role]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Reveal className="flex flex-col items-start gap-3">
        <Eyebrow tone="cobalt">New listing</Eyebrow>
        <h1 className="font-serif text-[clamp(2.5rem,7vw,4rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
          List something
        </h1>
        <p className="text-ink-2">Set the board, the winners and the countdown. You&rsquo;ll get a link and QR code to share.</p>
      </Reveal>
      {role === "superadmin" && <label className="flex flex-col gap-2 text-sm font-medium">Create on behalf of
        <select className={inputClass} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
          <option value="">My account</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} (@{account.username})</option>)}
        </select>
      </label>}
      {error && <p role="alert" className="text-rose">{error}</p>}
      <Reveal index={1}>
        <Shell innerClassName="p-5 sm:p-9">
          <ListingForm
            key={ownerId}
            defaultOwnerName={accounts.find((account) => account.id === ownerId)?.name ?? admin}
            onSubmit={async (form) => {
              const res = await adminFetch(ownerId ? `/api/listings?adminId=${encodeURIComponent(ownerId)}` : "/api/listings", { method: "POST", body: form });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) return body.error ?? "Could not create the listing.";
              router.push(`/admin/listings/${body.slug}/share?created=1`);
              return null;
            }}
          />
        </Shell>
      </Reveal>
    </div>
  );
}
