import "server-only";
import { destroyImage } from "./cloudinary";
import { getDb } from "./mongodb";

/** Failed deletions stay queued so a successful listing save is never reported as a failure. */
export async function retireImage(publicId: string) {
  try {
    const db = await getDb();
    const queue = db.collection("imageCleanup");
    await queue.updateOne({ publicId }, { $setOnInsert: { publicId, createdAt: new Date() } }, { upsert: true });
    // A timed-out database save may still have committed. Never delete a referenced asset.
    if (await db.collection("listings").findOne({ "image.publicId": publicId }, { projection: { _id: 1 } })) {
      await queue.deleteOne({ publicId });
      return;
    }
    await destroyImage(publicId);
    await queue.deleteOne({ publicId });
  } catch {
    console.warn("Cloudinary image cleanup needs a retry. Run the image migration command with --cleanup.");
  }
}
