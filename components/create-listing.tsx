"use client";

import Link from "next/link";
import { useState } from "react";
import { saveOwnerKey } from "@/lib/client";
import { ListingForm } from "./listing-form";
import { CopyField } from "./copy-field";
import { buttonClass } from "./ui";

type Created = { slug: string; ownerKey: string; scheduled: boolean };

export function CreateListing() {
  const [created, setCreated] = useState<Created | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (created) {
    const origin = window.location.origin;
    const publicUrl = `${origin}/l/${created.slug}`;
    const ownerUrl = `${origin}/l/${created.slug}/manage#key=${created.ownerKey}`;
    return (
      <div className="pop flex flex-col gap-6">
        <div>
          <h2 className="font-serif text-3xl leading-tight tracking-[-0.03em] text-ink">
            {created.scheduled ? "Your draw is scheduled." : "Your draw is live."}
          </h2>
          <p className="mt-2 text-[15px] text-ink-2">
            Share the link below. Everyone who opens it can claim one number from 1 to 50.
          </p>
        </div>
        <CopyField label="Share link" value={publicUrl} />
        {created.scheduled && (
          <div className="flex flex-col gap-2">
            <CopyField label="Private owner link" value={ownerUrl} />
            <p className="text-[13px] leading-relaxed text-muted">
              Keep this one to yourself. It lets you edit or remove the listing until the countdown starts.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href={`/l/${created.slug}`} className={buttonClass}>
            Open the draw
          </Link>
          <button
            type="button"
            className="px-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            onClick={() => {
              setCreated(null);
              setFormKey((k) => k + 1);
            }}
          >
            List another product
          </button>
        </div>
      </div>
    );
  }

  return (
    <ListingForm
      key={formKey}
      onSubmit={async (form) => {
        const res = await fetch("/api/listings", { method: "POST", body: form });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return body.error ?? "Could not create the listing.";
        saveOwnerKey(body.slug, body.ownerKey);
        setCreated({ ...body, scheduled: form.get("startMode") === "later" });
        return null;
      }}
    />
  );
}
