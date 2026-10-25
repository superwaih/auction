"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useMounted } from "@/lib/client";
import { CopyField } from "./copy-field";
import { ghostButtonClass } from "./ui";

const QR_COLORS = { dark: "#1c1917", light: "#ffffff" };

/**
 * The owner's share kit: a QR code people scan to open the board, the link
 * itself, and a print-ready PNG download.
 */
export function SharePanel({
  url,
  title,
  compact = false,
  large = false,
}: {
  url: string;
  title: string;
  compact?: boolean;
  /** The admin share page: a QR big enough to scan off a screen across a room. */
  large?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const canShare = useMounted() && typeof navigator.share === "function";

  useEffect(() => {
    let cancelled = false;
    // Rendered as an <img> of a square SVG so it scales cleanly and can never stretch.
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: QR_COLORS }).then((svg) => {
      if (!cancelled) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function download() {
    const png = await QRCode.toDataURL(url, { width: 1200, margin: 3, errorCorrectionLevel: "M", color: QR_COLORS });
    const a = document.createElement("a");
    a.href = png;
    a.download = `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "draw"}-qr.png`;
    a.click();
  }

  return (
    <div className={`flex gap-6 ${compact || large ? "flex-col" : "flex-col sm:flex-row sm:items-center"}`}>
      <div
        className={`shrink-0 rounded-[1.5rem] bg-black/[0.035] p-1.5 ring-1 ring-black/[0.05] ${
          large
            ? "mx-auto w-full max-w-[26rem]"
            : compact
              ? "mx-auto w-full max-w-[19rem]"
              : "mx-auto w-full max-w-[19rem] sm:mx-0 sm:w-60"
        }`}
      >
        <div className="rounded-[calc(1.5rem-0.375rem)] bg-white p-5">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URI
            <img src={src} alt={`QR code that opens ${url}`} className="block aspect-square h-auto w-full" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-lg bg-paper" />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Scan to open the board and pick a number. Print it, put it on a screen, or send the link.
        </p>
        <CopyField label="Draw link" value={url} />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className={`${ghostButtonClass} min-h-11`} onClick={download}>
            Download QR
          </button>
          {canShare && (
            <button
              type="button"
              className={`${ghostButtonClass} min-h-11`}
              onClick={() => navigator.share({ title, url }).catch(() => {})}
            >
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
