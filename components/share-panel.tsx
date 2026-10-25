"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useMounted } from "@/lib/client";
import { CopyField } from "./copy-field";
import { ghostButtonClass } from "./ui";

const QR_COLORS = { dark: "#2a211c", light: "#ffffff" };

/**
 * The owner's share kit: a QR code people scan to open the board, the link
 * itself, and a print-ready PNG download.
 */
export function SharePanel({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const [svg, setSvg] = useState<string | null>(null);
  const canShare = useMounted() && typeof navigator.share === "function";

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: QR_COLORS }).then((s) => {
      if (!cancelled) setSvg(s);
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
    <div className={`flex gap-6 ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-center"}`}>
      <div
        className={`shrink-0 self-start rounded-[1.25rem] bg-black/[0.035] p-1.5 ring-1 ring-black/[0.05] ${compact ? "w-full max-w-56" : "w-44"}`}
      >
        <div className="rounded-[calc(1.25rem-0.375rem)] bg-surface p-4">
          {svg ? (
            <div
              className="aspect-square [&>svg]:size-full"
              role="img"
              aria-label={`QR code that opens ${url}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="aspect-square animate-pulse rounded-lg bg-paper" />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Scan to open the board and pick a number. Print it, put it on a screen, or send the link.
        </p>
        <CopyField label="Draw link" value={url} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostButtonClass} onClick={download}>
            Download QR
          </button>
          {canShare && (
            <button
              type="button"
              className={ghostButtonClass}
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
