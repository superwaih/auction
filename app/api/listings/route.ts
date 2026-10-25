import { adminNameFrom, errorResponse, readListingForm } from "@/lib/api";
import { createListing, listListings } from "@/lib/listings";

export async function GET() {
  try {
    return Response.json(await listListings(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

// Admin only: the admin pages send their name with every create.
export async function POST(req: Request) {
  try {
    const admin = adminNameFrom(req);
    const created = await createListing(await readListingForm(req), admin);
    return Response.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
