import type { NextRequest } from "next/server";
import { errorResponse, ownerKeyFrom, readListingForm } from "@/lib/api";
import { ListingError, deleteListing, getListing, updateListing } from "@/lib/listings";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    const clientId = req.nextUrl.searchParams.get("client") ?? undefined;
    const listing = await getListing(slug, clientId);
    if (!listing) throw new ListingError("Listing not found.", 404);
    return Response.json(listing, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    await updateListing(slug, ownerKeyFrom(req), await readListingForm(req));
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    await deleteListing(slug, ownerKeyFrom(req));
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
