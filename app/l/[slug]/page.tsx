import { Suspense } from "react";
import { ListingRoom, RoomSkeleton } from "@/components/listing-room";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

export default function ListingPage({ params }: PageProps<"/l/[slug]">) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Suspense fallback={<RoomSkeleton />}>
          <Room params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

// Awaiting params here, inside the boundary, keeps the shell static and lets the board hydrate
// straight away. Passing the raw params promise down as a child left it frozen for seconds.
async function Room({ params }: { params: PageProps<"/l/[slug]">["params"] }) {
  const { slug } = await params;
  return <ListingRoom slug={slug} />;
}
