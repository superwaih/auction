import nextEnv from "@next/env";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(root);
const jiti = createJiti(import.meta.url, { alias: { "server-only": fileURLToPath(new URL("../node_modules/server-only/empty.js", import.meta.url)) } });
const { getDb } = await jiti.import("../lib/mongodb.ts");
const { uploadImage, CloudinaryError } = await jiti.import("../lib/cloudinary.ts");
const { retireImage } = await jiti.import("../lib/image-cleanup.ts");
let failures = 0;
try {
  const db = await getDb();
  if (process.argv.includes("--cleanup")) {
    for await (const entry of db.collection("imageCleanup").find()) await retireImage(entry.publicId);
    const remaining = await db.collection("imageCleanup").countDocuments();
    console.log(`Image cleanup complete; ${remaining} queued deletions remain.`);
    failures = remaining;
  } else {
    const listings = db.collection("listings");
    const filter = { "image.data": { $exists: true } };
    console.log(`${await listings.countDocuments(filter)} legacy images found.`);
    if (!process.argv.includes("--apply")) console.log("Dry run only. Add --apply to upload and migrate these images.");
    else {
      for await (const listing of listings.find(filter)) {
        let uploaded;
        try {
          uploaded = await uploadImage({ data: Buffer.from(listing.image.data.buffer), type: listing.image.type });
          const result = await listings.updateOne(
            { _id: listing._id, updatedAt: listing.updatedAt, "image.data": { $exists: true } },
            { $set: { image: uploaded, updatedAt: new Date() } },
          );
          if (!result.matchedCount) {
            await retireImage(uploaded.publicId);
            console.log(`Skipped ${listing.slug}: listing changed during upload.`);
          } else console.log(`Migrated ${listing.slug}.`);
        } catch (error) {
          if (uploaded) await retireImage(uploaded.publicId);
          failures++;
          console.error(`Could not migrate ${listing.slug}. ${error instanceof CloudinaryError ? error.message : "Database or network error; original data was not intentionally removed."}`);
        }
      }
    }
  }
} catch (error) {
  failures++;
  console.error(`Migration could not complete (${error.code ?? error.name}). Check database connectivity and Cloudinary configuration.`);
} finally {
  if (globalThis._mongoClient) await (await globalThis._mongoClient).close().catch(() => {});
}
process.exitCode = failures ? 1 : 0;
