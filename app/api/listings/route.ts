import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-auth";
import { errorResponse, readListingForm } from "@/lib/api";
import { ListingError, createListing, listListings } from "@/lib/listings";

export async function GET() {
  try {
    return Response.json(await listListings(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

// Creation requires an authenticated admin account.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    const selectedAdmin = new URL(req.url).searchParams.get("adminId");
    let owner = admin;
    if (selectedAdmin && selectedAdmin !== admin.id) {
      if (admin.role !== "superadmin") throw new ListingError("Superadmin access is required.", 403);
      if (!ObjectId.isValid(selectedAdmin)) throw new ListingError("Choose a valid admin.");
      const account = await (await getDb()).collection("admins").findOne({ _id: new ObjectId(selectedAdmin) });
      if (!account) throw new ListingError("Admin not found.", 404);
      owner = { ...admin, id: account._id.toHexString(), name: account.name };
    }
    const created = await createListing(await readListingForm(req), owner.name, owner.id);
    return Response.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
