import { errorResponse, readListingForm } from "@/lib/api";
import { createListing, listOpenListings } from "@/lib/listings";

export async function GET() {
  try {
    return Response.json(await listOpenListings(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const created = await createListing(await readListingForm(req));
    return Response.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
