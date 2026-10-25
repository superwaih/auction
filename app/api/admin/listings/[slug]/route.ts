import type { NextRequest } from "next/server";
import { adminNameFrom, errorResponse } from "@/lib/api";
import { ListingError, getAdminListing } from "@/lib/listings";

// One listing for the admin edit page.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/listings/[slug]">) {
  try {
    const { slug } = await ctx.params;
    adminNameFrom(req);
    const listing = await getAdminListing(slug);
    if (!listing) throw new ListingError("Listing not found.", 404);
    return Response.json(listing, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
