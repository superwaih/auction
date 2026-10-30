import type { Metadata } from "next";
import { LiveListings } from "@/components/live-listings";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

export const metadata: Metadata = {
  title: "Live draws — Kivos",
  description: "Every product draw that is open right now, and the ones starting soon.",
};

export default function LivePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 md:pt-16">
        <LiveListings />
      </main>
      <SiteFooter />
    </>
  );
}
