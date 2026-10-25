"use client";

import Link from "next/link";
import { useState } from "react";
import { saveOwnerKey } from "@/lib/client";
import { ListingForm } from "./listing-form";
import { CopyField } from "./copy-field";
import { SharePanel } from "./share-panel";
import { ArrowBadge, Eyebrow, buttonClass } from "./ui";

type Created = { slug: string; ownerKey: string; scheduled: boolean; name: string };

export function CreateListing() {
  const [created, setCreated] = useState<Created | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (created) {
    const origin = window.location.origin;
    const publicUrl = `${origin}/l/${created.slug}`;
    const ownerUrl = `${origin}/l/${created.slug}/manage#key=${created.ownerKey}`;
    return (
      <div className="pop flex flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <Eyebrow tone="sage">{created.scheduled ? "Scheduled" : "Live now"}</Eyebrow>
          <h2 className="font-serif text-4xl font-light leading-[1.05] tracking-[-0.035em] text-ink">
            {created.scheduled ? "Your draw is scheduled." : "Your draw is live."}
          </h2>
        </div>
        <SharePanel url={publicUrl} title={created.name} compact />
        {created.scheduled && (
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-wash/60 p-4">
            <CopyField label="Private owner link" value={ownerUrl} />
            <p className="text-[13px] leading-relaxed text-ink-2">
              Keep this one to yourself. It lets you edit or remove the listing until the countdown starts.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/l/${created.slug}`} className={buttonClass}>
            Open the draw
            <ArrowBadge />
          </Link>
          <button
            type="button"
            className="text-sm text-muted underline-offset-4 transition-colors duration-500 ease-spring hover:text-ink hover:underline"
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
        setCreated({
          ...body,
          scheduled: form.get("startMode") === "later",
          name: String(form.get("name") ?? ""),
        });
        return null;
      }}
    />
  );
}
