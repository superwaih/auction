import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Binary, MongoServerError, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import {
  MAX_DURATION_MINUTES,
  MAX_NAME_LENGTH,
  MAX_OWNER_NAME_LENGTH,
  MAX_NUMBER,
  MIN_NUMBER,
  type ListingStatus,
  type PublicListing,
  type ListingSummary,
  type ClosedListing,
} from "./types";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
// Polls and lists never need the image bytes, only whether there is one.
const NO_IMAGE_BYTES = { "image.data": 0 } as const;
const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;

type ListingDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  /** Optional only for listings created before the field existed. */
  ownerName?: string;
  image: { data: Binary; type: string } | null;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  ownerKeyHash: string;
  winningNumber: number | null;
  drawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PickDoc = {
  _id: ObjectId;
  listingId: ObjectId;
  number: number;
  name: string;
  clientId: string;
  createdAt: Date;
};

export class ListingError extends Error {
  constructor(
    message: string,
    public status = 400,
    /** Machine-readable reason the client can act on, e.g. "taken". */
    public code?: string,
  ) {
    super(message);
  }
}

export type ListingInput = {
  name: string;
  ownerName: string;
  durationMinutes: number;
  startMode: "now" | "later";
  startsAt?: string;
  image?: { data: Buffer; type: string } | null;
};

async function collections() {
  const db = await getDb();
  return {
    listings: db.collection<ListingDoc>("listings"),
    picks: db.collection<PickDoc>("picks"),
  };
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function newSlug() {
  // 8 chars, no ambiguous characters, easy to read out loud.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 8; i++) slug += alphabet[randomInt(alphabet.length)];
  return slug;
}

function statusOf(doc: Pick<ListingDoc, "startsAt" | "endsAt">, now: Date): ListingStatus {
  if (now < doc.startsAt) return "scheduled";
  if (now < doc.endsAt) return "live";
  return "ended";
}

function validate(input: ListingInput, now: Date) {
  const name = input.name.trim();
  if (!name) throw new ListingError("Give the product a name.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new ListingError(`Keep the name under ${MAX_NAME_LENGTH} characters.`);
  }
  const ownerName = input.ownerName.trim();
  if (!ownerName) throw new ListingError("Add your name so people know who is listing.");
  if (ownerName.length > MAX_OWNER_NAME_LENGTH) {
    throw new ListingError(`Keep your name under ${MAX_OWNER_NAME_LENGTH} characters.`);
  }
  const duration = Math.round(input.durationMinutes);
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
    throw new ListingError(`Duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`);
  }
  let startsAt = now;
  if (input.startMode === "later") {
    startsAt = new Date(input.startsAt ?? "");
    if (Number.isNaN(startsAt.getTime())) throw new ListingError("Pick a start time.");
    if (startsAt.getTime() <= now.getTime()) throw new ListingError("The start time has to be in the future.");
    if (startsAt.getTime() - now.getTime() > MAX_SCHEDULE_AHEAD_MS) {
      throw new ListingError("Schedule at most 30 days ahead.");
    }
  }
  if (input.image) {
    if (!input.image.type.startsWith("image/")) throw new ListingError("That file is not an image.");
    if (input.image.data.byteLength > MAX_IMAGE_BYTES) throw new ListingError("Images can be at most 2 MB.");
  }
  return {
    name,
    ownerName,
    durationMinutes: duration,
    startsAt,
    endsAt: new Date(startsAt.getTime() + duration * 60_000),
  };
}

export async function createListing(input: ListingInput) {
  const now = new Date();
  const fields = validate(input, now);
  const { listings } = await collections();
  const ownerKey = randomBytes(24).toString("base64url");

  for (let attempt = 0; attempt < 5; attempt++) {
    const doc: ListingDoc = {
      _id: new ObjectId(),
      slug: newSlug(),
      ...fields,
      image: input.image ? { data: new Binary(input.image.data), type: input.image.type } : null,
      ownerKeyHash: hashKey(ownerKey),
      winningNumber: null,
      drawnAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await listings.insertOne(doc);
      return { slug: doc.slug, ownerKey };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) continue; // slug collision
      throw err;
    }
  }
  throw new ListingError("Could not create the listing, try again.", 500);
}

async function ownedListing(slug: string, ownerKey: string) {
  const { listings } = await collections();
  const doc = await listings.findOne({ slug });
  if (!doc) throw new ListingError("Listing not found.", 404);
  const given = Buffer.from(hashKey(ownerKey));
  const stored = Buffer.from(doc.ownerKeyHash);
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
    throw new ListingError("This owner link is not valid.", 403);
  }
  return doc;
}

export async function verifyOwner(slug: string, ownerKey: string) {
  await ownedListing(slug, ownerKey);
}

/**
 * Owners may change everything until the listing goes live. After that it is
 * locked; the filter on startsAt makes the lock hold even under a race.
 */
export async function updateListing(
  slug: string,
  ownerKey: string,
  input: ListingInput & { removeImage?: boolean },
) {
  const doc = await ownedListing(slug, ownerKey);
  const now = new Date();
  if (statusOf(doc, now) !== "scheduled") {
    throw new ListingError("This listing is live, so it can no longer be edited.", 409);
  }
  const fields = validate(input, now);
  const set: Partial<ListingDoc> = { ...fields, updatedAt: now };
  if (input.image) set.image = { data: new Binary(input.image.data), type: input.image.type };
  else if (input.removeImage) set.image = null;

  const { listings } = await collections();
  const res = await listings.updateOne({ _id: doc._id, startsAt: { $gt: now } }, { $set: set });
  if (res.matchedCount === 0) {
    throw new ListingError("This listing is live, so it can no longer be edited.", 409);
  }
}

export async function deleteListing(slug: string, ownerKey: string) {
  const doc = await ownedListing(slug, ownerKey);
  const now = new Date();
  const { listings, picks } = await collections();
  const res = await listings.deleteOne({ _id: doc._id, startsAt: { $gt: now } });
  if (res.deletedCount === 0) {
    throw new ListingError("This listing is live, so it can no longer be removed.", 409);
  }
  await picks.deleteMany({ listingId: doc._id });
}

/**
 * Draws the winner once the countdown is over. Runs lazily on read; the
 * drawnAt: null filter guarantees exactly one draw even with many readers.
 */
async function settle(doc: ListingDoc, now: Date): Promise<ListingDoc> {
  if (doc.drawnAt || now < doc.endsAt) return doc;
  const { listings, picks } = await collections();
  const taken = await picks.find({ listingId: doc._id }, { projection: { number: 1 } }).toArray();
  const winningNumber = taken.length ? taken[randomInt(taken.length)].number : null;
  const updated = await listings.findOneAndUpdate(
    { _id: doc._id, drawnAt: null },
    { $set: { winningNumber, drawnAt: now } },
    { returnDocument: "after", projection: NO_IMAGE_BYTES },
  );
  return updated ?? ((await listings.findOne({ _id: doc._id }, { projection: NO_IMAGE_BYTES })) as ListingDoc);
}

function summary(doc: ListingDoc, now: Date, pickCount: number): ListingSummary {
  return {
    slug: doc.slug,
    name: doc.name,
    ownerName: doc.ownerName ?? "",
    hasImage: doc.image !== null,
    imageVersion: doc.updatedAt.getTime(),
    durationMinutes: doc.durationMinutes,
    startsAt: doc.startsAt.toISOString(),
    endsAt: doc.endsAt.toISOString(),
    status: statusOf(doc, now),
    pickCount,
  };
}

export async function getListing(slug: string, clientId?: string): Promise<PublicListing | null> {
  const { listings, picks } = await collections();
  const now = new Date();
  const found = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!found) return null;
  const doc = await settle(found, now);
  const all = await picks.find({ listingId: doc._id }).sort({ number: 1 }).toArray();
  const winner = doc.winningNumber === null ? null : all.find((p) => p.number === doc.winningNumber);
  const mine = clientId ? all.find((p) => p.clientId === clientId) : undefined;
  // Until the draw is settled, nobody sees which numbers others hold, only how many.
  const drawn = doc.drawnAt !== null;
  const visible = drawn ? all : mine ? [mine] : [];
  return {
    ...summary(doc, now, all.length),
    picks: visible.map((p) => ({ number: p.number, name: p.name })),
    picksHidden: !drawn,
    myNumber: mine?.number ?? null,
    winningNumber: doc.winningNumber,
    winnerName: winner?.name ?? null,
    drawn,
    serverNow: now.toISOString(),
  };
}

const CLOSED_LIMIT = 24;

export async function listListings(): Promise<{
  live: ListingSummary[];
  upcoming: ListingSummary[];
  closed: ClosedListing[];
}> {
  const { listings } = await collections();
  const now = new Date();
  const [open, ended] = await Promise.all([
    listings.find({ endsAt: { $gt: now } }, { projection: NO_IMAGE_BYTES }).sort({ endsAt: 1 }).limit(60).toArray(),
    listings
      .find({ endsAt: { $lte: now } }, { projection: NO_IMAGE_BYTES })
      .sort({ endsAt: -1 })
      .limit(CLOSED_LIMIT)
      .toArray(),
  ]);
  const all = await describe([...open, ...ended], now);
  return {
    live: all.filter((l) => l.status === "live"),
    upcoming: all.filter((l) => l.status === "scheduled").sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    closed: all.filter((l) => l.status === "ended"),
  };
}

const MAX_LOOKUP = 50;

/** The seller's own listings for the My listings page, in the order the slugs were given. */
export async function getListingsBySlugs(slugs: string[]): Promise<ClosedListing[]> {
  const wanted = [...new Set(slugs.filter((s) => /^[a-z0-9]{6,12}$/.test(s)))].slice(0, MAX_LOOKUP);
  if (!wanted.length) return [];
  const { listings } = await collections();
  const docs = await listings.find({ slug: { $in: wanted } }, { projection: NO_IMAGE_BYTES }).toArray();
  const described = await describe(docs, new Date());
  const bySlug = new Map(described.map((l) => [l.slug, l]));
  return wanted.flatMap((s) => bySlug.get(s) ?? []);
}

/**
 * Summaries with pick counts, plus the winner for finished draws. Closed draws
 * nobody has opened since zero get their winner drawn here.
 */
async function describe(docs: ListingDoc[], now: Date): Promise<ClosedListing[]> {
  const { picks } = await collections();
  const settled = await Promise.all(docs.map((d) => settle(d, now)));

  const counts = await picks
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { listingId: { $in: settled.map((d) => d._id) } } },
      { $group: { _id: "$listingId", n: { $sum: 1 } } },
    ])
    .toArray();
  const countOf = new Map(counts.map((c) => [c._id.toHexString(), c.n]));

  const withWinner = settled.filter((d) => d.winningNumber !== null);
  const winners = withWinner.length
    ? await picks
        .find(
          { $or: withWinner.map((d) => ({ listingId: d._id, number: d.winningNumber as number })) },
          { projection: { listingId: 1, name: 1 } },
        )
        .toArray()
    : [];
  const winnerOf = new Map(winners.map((p) => [p.listingId.toHexString(), p.name]));

  return settled.map((d) => ({
    ...summary(d, now, countOf.get(d._id.toHexString()) ?? 0),
    winningNumber: d.winningNumber,
    winnerName: winnerOf.get(d._id.toHexString()) ?? null,
  }));
}

export async function getListingImage(slug: string) {
  const { listings } = await collections();
  const doc = await listings.findOne({ slug }, { projection: { image: 1 } });
  if (!doc?.image) return null;
  return { data: Buffer.from(doc.image.data.buffer), type: doc.image.type };
}

export async function pickNumber(slug: string, input: { number: number; name: string; clientId: string }) {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!doc) throw new ListingError("Listing not found.", 404);

  const now = new Date();
  const status = statusOf(doc, now);
  if (status === "scheduled") throw new ListingError("This draw has not opened yet.", 409);
  if (status === "ended") throw new ListingError("This draw has closed.", 409);

  const number = Number(input.number);
  if (!Number.isInteger(number) || number < MIN_NUMBER || number > MAX_NUMBER) {
    throw new ListingError(`Pick a whole number from ${MIN_NUMBER} to ${MAX_NUMBER}.`);
  }
  const name = input.name.trim();
  if (!name) throw new ListingError("Add your name so the winner can be identified.");
  if (name.length > 40) throw new ListingError("Keep your name under 40 characters.");
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(input.clientId)) throw new ListingError("Missing device id.");

  try {
    await picks.insertOne({
      _id: new ObjectId(),
      listingId: doc._id,
      number,
      name,
      clientId: input.clientId,
      createdAt: now,
    });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      const mine = await picks.findOne({ listingId: doc._id, clientId: input.clientId });
      if (mine) throw new ListingError(`You already hold number ${mine.number}.`, 409);
      throw new ListingError(`Number ${number} is already taken. Pick another.`, 409, "taken");
    }
    throw err;
  }
}
