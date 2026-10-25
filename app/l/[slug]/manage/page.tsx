import { Suspense } from "react";
import { ManageListing } from "@/components/manage-listing";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

export const metadata = { robots: { index: false } };

export default function ManagePage({ params }: PageProps<"/l/[slug]/manage">) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <Suspense>
          {params.then(({ slug }) => (
            <ManageListing slug={slug} />
          ))}
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
