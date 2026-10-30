import "server-only";
import { CloudinaryError } from "./cloudinary";
import { MongoNetworkError, MongoServerSelectionError } from "mongodb";
import { ListingError, MAX_IMAGE_BYTES, type ListingInput } from "./listings";

export function errorResponse(err: unknown) {
  if (err instanceof CloudinaryError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof ListingError) {
    return Response.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(err);
  // Atlas refusing the connection (IP not on its access list), DNS or network drops, timeouts.
  if (err instanceof MongoServerSelectionError || err instanceof MongoNetworkError) {
    return Response.json(
      { error: "We can't reach the database right now. Please try again in a moment.", code: "db_unavailable" },
      { status: 503 },
    );
  }
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

/** Reads the create/edit form, shared by POST and PATCH. */
export async function readListingForm(req: Request): Promise<ListingInput & { removeImage: boolean }> {
  const form = await req.formData();
  const file = form.get("image");
  let image: ListingInput["image"] = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) throw new ListingError("Images can be at most 2 MB.");
    image = { data: Buffer.from(await file.arrayBuffer()), type: file.type };
  }
  return {
    name: String(form.get("name") ?? ""),
    ownerName: String(form.get("ownerName") ?? ""),
    category: String(form.get("category") ?? ""),
    slots: Number(form.get("slots") ?? 0),
    winnerCount: Number(form.get("winnerCount") ?? 0),
    durationMinutes: Number(form.get("durationMinutes") ?? 0),
    startMode: form.get("startMode") === "later" ? "later" : "now",
    startsAt: String(form.get("startsAt") ?? ""),
    image,
    removeImage: form.get("removeImage") === "1",
  };
}
