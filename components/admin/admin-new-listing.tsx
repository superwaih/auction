"use client";

import { useRouter } from "next/navigation";
import { adminFetch, useAdminName } from "@/lib/client";
import { ListingForm } from "../listing-form";
import { Reveal } from "../reveal";
import { Eyebrow, Shell } from "../ui";

export function AdminNewListing() {
  const router = useRouter();
  const admin = useAdminName();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Reveal className="flex flex-col items-start gap-3">
        <Eyebrow tone="cobalt">New listing</Eyebrow>
        <h1 className="font-serif text-[clamp(2.5rem,7vw,4rem)] font-light leading-[1] tracking-[-0.045em] text-ink">
          List something
        </h1>
        <p className="text-ink-2">Set the board, the winners and the countdown. You&rsquo;ll get a link and QR code to share.</p>
      </Reveal>
      <Reveal index={1}>
        <Shell innerClassName="p-5 sm:p-9">
          <ListingForm
            defaultOwnerName={admin}
            onSubmit={async (form) => {
              const res = await adminFetch("/api/listings", { method: "POST", body: form });
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
