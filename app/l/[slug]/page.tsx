import { Suspense } from "react";
import { ListingRoom } from "@/components/listing-room";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

export default function ListingPage({ params }: PageProps<"/l/[slug]">) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Suspense>
          {params.then(({ slug }) => (
            <ListingRoom slug={slug} />
          ))}
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
