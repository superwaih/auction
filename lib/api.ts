import "server-only";
import { ListingError, MAX_IMAGE_BYTES, type ListingInput } from "./listings";

export function errorResponse(err: unknown) {
  if (err instanceof ListingError) {
    return Response.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(err);
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

/**
 * The admin's name, sent by the admin pages. It records who made a listing; it
 * is not a password, so it keeps casual visitors out of admin actions, nothing more.
 */
export function adminNameFrom(req: Request) {
  const name = decodeURIComponent(req.headers.get("x-admin-name") ?? "").trim();
  if (!name) throw new ListingError("Enter your admin name first.", 401);
  return name;
}
