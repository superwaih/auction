import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { getListingsBySlugs } from "@/lib/listings";

// Backs the My listings page: the browser keeps the slugs, the server fills in live status and winners.
export async function GET(req: NextRequest) {
  // Read outside the try: this access is how Next knows to render per request, and catching it breaks that.
  const slugs = (req.nextUrl.searchParams.get("slugs") ?? "").split(",");
  try {
    return Response.json(await getListingsBySlugs(slugs), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
