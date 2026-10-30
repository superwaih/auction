import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId, Binary } from "mongodb";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: {
  "server-only": new URL("../node_modules/server-only/empty.js", import.meta.url).pathname,
  "./mongodb": new URL("./fixtures/database.mjs", import.meta.url).pathname,
} });
const cloud = await jiti.import("../lib/cloudinary.ts");
const listings = await jiti.import("../lib/listings.ts");
const { retireImage } = await jiti.import("../lib/image-cleanup.ts");
const { imageUrl } = await jiti.import("../lib/types.ts");
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
const asset = { provider: "cloudinary", publicId: "kivos/listings/new", url: "https://res.cloudinary.com/test-cloud/image/upload/v1/kivos/listings/new.jpg", width: 1200, height: 800, bytes: 100, format: "jpg" };
const uploadResult = { public_id: asset.publicId, secure_url: asset.url, width: 1200, height: 800, bytes: 100, format: "jpg" };
const image = { data: Buffer.from("test image bytes"), type: "image/jpeg" };
const input = { name: "Prize", ownerName: "Admin", category: "product", slots: 50, winnerCount: 1, durationMinutes: 5, startMode: "now", image };

function fixture() {
  const state = { doc: { _id: new ObjectId(), slug: "prize", startsAt: new Date(Date.now() + 3600000), updatedAt: new Date(), image: { ...asset, publicId: "kivos/listings/old" } }, queue: new Set(), inserted: null, conflict: false };
  globalThis.authTestDb = { collection(name) {
    if (name === "imageCleanup") return {
      async updateOne({ publicId }) { state.queue.add(publicId); },
      async deleteOne({ publicId }) { state.queue.delete(publicId); },
    };
    if (name === "listings") return {
      async findOne(query) { return query["image.publicId"] ? (state.doc?.image?.publicId === query["image.publicId"] ? state.doc : null) : state.doc; },
      async insertOne(doc) { state.inserted = doc; state.doc = doc; },
      async updateOne(query, update) { if (state.conflict) return { matchedCount: 0 }; state.doc = { ...state.doc, ...update.$set }; return { matchedCount: 1 }; },
      async deleteOne() { state.doc = null; return { deletedCount: 1 }; },
    };
    if (name === "picks") return { find() { return { sort() { return { limit() { return { async next() { return null; } }; } }; } }; }, async deleteMany() {} };
    throw Error(`Unexpected collection: ${name}`);
  } };
  return state;
}

function mockCloud(t, destroyed = []) {
  return t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("/upload")) return Response.json(uploadResult);
    destroyed.push(options.body.get("public_id"));
    assert.equal(options.body.get("invalidate"), "true");
    return Response.json({ result: "ok" });
  });
}

test("uploads use server authentication and return only image metadata", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.cloudinary.com/v1_1/test-cloud/image/upload");
    assert.equal(options.headers.Authorization, `Basic ${Buffer.from("test-key:test-secret").toString("base64")}`);
    assert.equal(options.body.get("file").size, image.data.length);
    assert.match(options.body.get("public_id"), /^kivos\/listings\/[a-f0-9-]+$/);
    assert.equal(options.body.get("overwrite"), "false");
    return Response.json(uploadResult);
  });
  assert.deepEqual(await cloud.uploadImage(image), asset);
  assert.match(cloud.deliveryUrl(asset), /f_auto,q_auto,c_limit,w_1400\/v1/);
});

test("missing credentials fail without sending an upload", async (t) => {
  delete process.env.CLOUDINARY_API_SECRET;
  const fetch = t.mock.method(globalThis, "fetch", () => { throw Error("Should not fetch"); });
  try { await assert.rejects(cloud.uploadImage(image), { status: 503 }); assert.equal(fetch.mock.callCount(), 0); }
  finally { process.env.CLOUDINARY_API_SECRET = "test-secret"; }
});

test("new listings store Cloudinary metadata rather than image bytes", async (t) => {
  const state = fixture(); mockCloud(t);
  await listings.createListing(input, "Admin", "owner-id");
  assert.deepEqual(state.inserted.image, asset);
  assert.equal("data" in state.inserted.image, false);
});

test("a failed upload leaves the original image untouched", async (t) => {
  const state = fixture();
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: {} }, { status: 500 }));
  await assert.rejects(listings.updateListing("prize", input), { status: 502 });
  assert.equal(state.doc.image.publicId, "kivos/listings/old");
});

test("replacement saves the new image before deleting the old one", async (t) => {
  const state = fixture(); const destroyed = []; mockCloud(t, destroyed);
  await listings.updateListing("prize", input);
  assert.equal(state.doc.image.publicId, asset.publicId);
  assert.deepEqual(destroyed, ["kivos/listings/old"]);
  assert.equal(state.queue.size, 0);
});

test("a concurrent edit rolls back only the newly uploaded image", async (t) => {
  const state = fixture(); state.conflict = true;
  const destroyed = []; mockCloud(t, destroyed);
  await assert.rejects(listings.updateListing("prize", input), { status: 409 });
  assert.equal(state.doc.image.publicId, "kivos/listings/old");
  assert.deepEqual(destroyed, [asset.publicId]);
});

test("cleanup retains referenced images and queues failed deletions", async (t) => {
  const state = fixture(); const destroyed = []; const fetch = mockCloud(t, destroyed);
  await retireImage("kivos/listings/old");
  assert.equal(fetch.mock.callCount(), 0);
  fetch.mock.mockImplementation(async () => Response.json({}, { status: 500 }));
  t.mock.method(console, "warn", () => {});
  await retireImage("kivos/listings/unused");
  assert.equal(state.queue.has("kivos/listings/unused"), true);
});

test("removing an image and deleting a listing retire their Cloudinary assets", async (t) => {
  let state = fixture(); const destroyed = []; mockCloud(t, destroyed);
  await listings.updateListing("prize", { ...input, image: null, removeImage: true });
  assert.equal(state.doc.image, null);
  state = fixture();
  await listings.deleteListing("prize");
  assert.equal(state.doc, null);
  assert.deepEqual(destroyed, ["kivos/listings/old", "kivos/listings/old"]);
});

test("legacy image bytes remain readable and new URLs use the CDN", async () => {
  const state = fixture(); state.doc.image = { data: new Binary(Buffer.from("legacy")), type: "image/png" };
  assert.deepEqual(await listings.getListingImage("prize"), { data: Buffer.from("legacy"), type: "image/png" });
  assert.equal(imageUrl({ slug: "prize", imageVersion: 1 }), "/api/listings/prize/image?v=1");
  assert.equal(imageUrl({ slug: "prize", imageVersion: 1, imageUrl: asset.url }), asset.url);
});
