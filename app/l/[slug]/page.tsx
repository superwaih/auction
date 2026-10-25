import Link from "next/link";
import { Suspense } from "react";
import { ListingRoom } from "@/components/listing-room";
import { SiteFooter, SiteHeader } from "@/components/ui";

export default function ListingPage({ params }: PageProps<"/l/[slug]">) {
  return (
    <>
      <SiteHeader>
        <Link href="/#live" className="transition hover:text-ink">
          Live draws
        </Link>
        <Link href="/#list" className="transition hover:text-ink">
          List a product
        </Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl px-6">
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
