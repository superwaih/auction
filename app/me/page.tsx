import type { Metadata } from "next";
import { MyListings } from "@/components/my-listings";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

export const metadata: Metadata = {
  title: "My listings — Alfreed",
  robots: { index: false },
};

export default function MyListingsPage() {
  return (
    <>
      <SiteNav current="me" />
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 md:pt-14">
        <MyListings />
      </main>
      <SiteFooter />
    </>
  );
}
