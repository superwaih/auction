import { ListingRoom } from "@/components/listing-room";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/ui";

// Draw IDs aren't known at build time. Awaiting params inside <Suspense> made Next serve a
// generic App Shell and upgrade it in the background, leaving the board blank for seconds on a
// first visit. Awaiting at the top renders each draw URL on request instead; that render is cheap
// (no data, the board loads its own), so the page arrives complete. `instant = false` opts this
// route out of the static-shell check that would otherwise reject the top-level await.
export const instant = false;

export default async function ListingPage({ params }: PageProps<"/l/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <ListingRoom slug={slug} />
      </main>
      <SiteFooter />
    </>
  );
}
