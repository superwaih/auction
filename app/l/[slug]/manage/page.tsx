import { Suspense } from "react";
import { ManageListing } from "@/components/manage-listing";
import { SiteFooter, SiteHeader } from "@/components/ui";

export const metadata = { robots: { index: false } };

export default function ManagePage({ params }: PageProps<"/l/[slug]/manage">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-6 pt-8">
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
