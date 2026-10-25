import { getListingImage } from "@/lib/listings";

export async function GET(_req: Request, ctx: RouteContext<"/api/listings/[slug]/image">) {
  const { slug } = await ctx.params;
  const image = await getListingImage(slug);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.type,
      // URLs carry ?v=<updatedAt>, so a new image always gets a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
