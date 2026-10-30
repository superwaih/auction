import { requireListingAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";
import { errorResponse, readListingForm } from "@/lib/api";
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

// Admin edit: details and slots any time, timing and winner count only before it goes live.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    await requireListingAdmin(req, slug);
    return Response.json(await updateListing(slug, await readListingForm(req)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    await requireListingAdmin(req, slug);
    await deleteListing(slug);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
