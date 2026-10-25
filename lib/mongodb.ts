import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "auction";

// Reuse one client across hot reloads in dev and across requests in prod.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _mongoIndexes?: Promise<void>;
};

function client(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }
  globalForMongo._mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo._mongoClient;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(dbName);
  globalForMongo._mongoIndexes ??= ensureIndexes(db);
  await globalForMongo._mongoIndexes;
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("listings").createIndex({ slug: 1 }, { unique: true }),
    db.collection("listings").createIndex({ endsAt: 1, startsAt: 1 }),
    // One person per number, one number per person, per listing.
    db.collection("picks").createIndex({ listingId: 1, number: 1 }, { unique: true }),
    db.collection("picks").createIndex({ listingId: 1, clientId: 1 }, { unique: true }),
  ]);
}
