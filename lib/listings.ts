import "server-only";
import { randomInt } from "node:crypto";
import { Binary, MongoServerError, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import {
  CATEGORIES,
  DEFAULT_SLOTS,
  MAX_DURATION_MINUTES,
  MAX_NAME_LENGTH,
  MAX_OWNER_NAME_LENGTH,
  MAX_SLOTS,
  MAX_WINNERS,
  MIN_NUMBER,
  MIN_SLOTS,
  type Category,
  type ClosedListing,
  type ListingStatus,
  type ListingSummary,
  type PublicListing,
  type Winner,
} from "./types";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
// Polls and lists never need the image bytes, only whether there is one.
const NO_IMAGE_BYTES = { "image.data": 0 } as const;
const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;

type ListingDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  /** Optional on listings made before the field existed. */
  ownerName?: string;
  /** Optional on listings made before categories; read as "product". */
  category?: Category;
  /** Optional on older listings; read as 50. */
  slots?: number;
  /** Optional on older listings; read as 1. */
  winnerCount?: number;
  /** The admin name that created it, and its lowercase key for lookups. */
  createdBy?: string;
  createdByKey?: string;
  image: { data: Binary; type: string } | null;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
  /** Drawn numbers in order (first place first). Older draws only have winningNumber. */
  winningNumbers?: number[];
  winningNumber: number | null;
  drawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Left over from per-listing owner links. Unused. */
  ownerKeyHash?: string;
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
  category: string;
  slots: number;
  winnerCount: number;
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

const slotsOf = (d: ListingDoc) => d.slots ?? DEFAULT_SLOTS;
const winnerCountOf = (d: ListingDoc) => d.winnerCount ?? 1;
const winningNumbersOf = (d: ListingDoc) =>
  d.winningNumbers ?? (d.winningNumber !== null && d.winningNumber !== undefined ? [d.winningNumber] : []);

export const adminKey = (name: string) => name.trim().toLowerCase();

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

/** What people see, plus the board size: editable by the admin at any time. */
function validateDetails(input: ListingInput) {
  const name = input.name.trim();
  if (!name) throw new ListingError("Give the listing a name.");
  if (name.length > MAX_NAME_LENGTH) throw new ListingError(`Keep the name under ${MAX_NAME_LENGTH} characters.`);
  const ownerName = input.ownerName.trim();
  if (!ownerName) throw new ListingError("Add the seller's name.");
  if (ownerName.length > MAX_OWNER_NAME_LENGTH) {
    throw new ListingError(`Keep the seller's name under ${MAX_OWNER_NAME_LENGTH} characters.`);
  }
  if (!(CATEGORIES as readonly string[]).includes(input.category)) {
    throw new ListingError("Pick a category: product, service or food.");
  }
  const slots = Math.round(input.slots);
  if (!Number.isInteger(slots) || slots < MIN_SLOTS || slots > MAX_SLOTS) {
    throw new ListingError(`Slots must be between ${MIN_SLOTS} and ${MAX_SLOTS}.`);
  }
  if (input.image) {
    if (!input.image.type.startsWith("image/")) throw new ListingError("That file is not an image.");
    if (input.image.data.byteLength > MAX_IMAGE_BYTES) throw new ListingError("Images can be at most 2 MB.");
  }
  return { name, ownerName, category: input.category as Category, slots };
}

/** When it runs and how many win: fixed once live, so nobody's odds change mid-draw. */
function validateDrawRules(input: ListingInput, slots: number, now: Date) {
  const duration = Math.round(input.durationMinutes);
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
    throw new ListingError(`Duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`);
  }
  const winnerCount = Math.round(input.winnerCount);
  if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > MAX_WINNERS) {
    throw new ListingError(`Winners must be between 1 and ${MAX_WINNERS}.`);
  }
  if (winnerCount >= slots) throw new ListingError("There must be fewer winners than slots.");
  let startsAt = now;
  if (input.startMode === "later") {
    startsAt = new Date(input.startsAt ?? "");
    if (Number.isNaN(startsAt.getTime())) throw new ListingError("Pick a start time.");
    if (startsAt.getTime() <= now.getTime()) throw new ListingError("The start time has to be in the future.");
    if (startsAt.getTime() - now.getTime() > MAX_SCHEDULE_AHEAD_MS) {
      throw new ListingError("Schedule at most 30 days ahead.");
    }
  }
  return {
    durationMinutes: duration,
    winnerCount,
    startsAt,
    endsAt: new Date(startsAt.getTime() + duration * 60_000),
  };
}

export async function createListing(input: ListingInput, createdBy: string) {
  const admin = createdBy.trim();
  if (!admin) throw new ListingError("Enter your admin name first.", 401);
  const now = new Date();
  const details = validateDetails(input);
  const fields = { ...details, ...validateDrawRules(input, details.slots, now) };
  const { listings } = await collections();

  for (let attempt = 0; attempt < 5; attempt++) {
    const doc: ListingDoc = {
      _id: new ObjectId(),
      slug: newSlug(),
      ...fields,
      createdBy: admin,
      createdByKey: adminKey(admin),
      image: input.image ? { data: new Binary(input.image.data), type: input.image.type } : null,
      winningNumbers: [],
      winningNumber: null,
      drawnAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await listings.insertOne(doc);
      return { slug: doc.slug };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) continue; // slug collision
      throw err;
    }
  }
  throw new ListingError("Could not create the listing, try again.", 500);
}

/**
 * Admin edit. Details and slots can change at any time (slots never below a
 * number someone already holds). Timing and winner count change only while the
 * draw is scheduled; once live they are ignored. The startsAt filter keeps that
 * lock even if the draw goes live mid-save.
 */
export async function updateListing(slug: string, input: ListingInput & { removeImage?: boolean }) {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!doc) throw new ListingError("Listing not found.", 404);

  const now = new Date();
  const scheduled = statusOf(doc, now) === "scheduled";
  const details = validateDetails(input);

  const highest = await picks.find({ listingId: doc._id }).sort({ number: -1 }).limit(1).next();
  if (highest && details.slots < highest.number) {
    throw new ListingError(`Number ${highest.number} is already picked, so keep at least ${highest.number} slots.`);
  }
  if (!scheduled && winnerCountOf(doc) >= details.slots) {
    throw new ListingError("There must be more slots than winners.");
  }

  const set: Partial<ListingDoc> = {
    ...details,
    ...(scheduled ? validateDrawRules(input, details.slots, now) : {}),
    updatedAt: now,
  };
  if (input.image) set.image = { data: new Binary(input.image.data), type: input.image.type };
  else if (input.removeImage) set.image = null;

  const filter = scheduled ? { _id: doc._id, startsAt: { $gt: now } } : { _id: doc._id };
  const res = await listings.updateOne(filter, { $set: set });
  if (res.matchedCount === 0) {
    throw new ListingError("This draw went live while you were editing. Its timing is now locked; save again.", 409);
  }
  return { rulesLocked: !scheduled };
}

/**
 * Admin: close a live draw early and draw its winners from the numbers claimed
 * so far. The endsAt filter makes it a no-op race-safely if it ended meanwhile.
 */
export async function endListingNow(slug: string) {
  const { listings } = await collections();
  const doc = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!doc) throw new ListingError("Listing not found.", 404);
  const now = new Date();
  const status = statusOf(doc, now);
  if (status === "scheduled") throw new ListingError("This draw hasn't started yet. Start it from Edit first.", 409);
  if (status === "ended") throw new ListingError("This draw has already ended.", 409);
  const updated = await listings.findOneAndUpdate(
    { _id: doc._id, endsAt: { $gt: now }, drawnAt: null },
    { $set: { endsAt: now, updatedAt: now } },
    { returnDocument: "after", projection: NO_IMAGE_BYTES },
  );
  if (updated) await settle(updated, now);
}

/**
 * Admin: run a closed draw again, but only one that ended with no winner (nobody
 * picked), so no result is ever overwritten. Keeps the details; resets the clock.
 */
export async function reopenListing(
  slug: string,
  input: Pick<ListingInput, "durationMinutes" | "startMode" | "startsAt">,
) {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!doc) throw new ListingError("Listing not found.", 404);
  const now = new Date();
  if (statusOf(doc, now) !== "ended") throw new ListingError("Only closed draws can be reopened.", 409);
  const settled = await settle(doc, now);
  if (winningNumbersOf(settled).length > 0 || (await picks.countDocuments({ listingId: doc._id })) > 0) {
    throw new ListingError("This draw has a winner, so it can't be reopened.", 409);
  }

  const { durationMinutes, startsAt, endsAt } = validateDrawRules(
    { ...input, winnerCount: winnerCountOf(doc) } as ListingInput,
    slotsOf(doc),
    now,
  );
  const res = await listings.updateOne(
    { _id: doc._id, drawnAt: { $ne: null }, winningNumber: null },
    { $set: { durationMinutes, startsAt, endsAt, drawnAt: null, winningNumbers: [], winningNumber: null, updatedAt: now } },
  );
  if (res.matchedCount === 0) throw new ListingError("This draw changed while you were reopening it. Try again.", 409);
}

/** Admin: everyone who has picked, with names, even while the draw is running. */
export async function getEntrants(slug: string) {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: { _id: 1 } });
  if (!doc) throw new ListingError("Listing not found.", 404);
  const all = await picks.find({ listingId: doc._id }).sort({ number: 1 }).toArray();
  return all.map((p) => ({ number: p.number, name: p.name, pickedAt: p.createdAt.toISOString() }));
}

/** Only before a draw opens: once people hold numbers, the draw has to run. */
export async function deleteListing(slug: string) {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: { _id: 1 } });
  if (!doc) throw new ListingError("Listing not found.", 404);
  const res = await listings.deleteOne({ _id: doc._id, startsAt: { $gt: new Date() } });
  if (res.deletedCount === 0) {
    throw new ListingError("This draw has started, so it can no longer be removed.", 409);
  }
  await picks.deleteMany({ listingId: doc._id });
}

/**
 * Draws the winners once the countdown is over: `winnerCount` different picked
 * numbers, in order (or everyone, if fewer people picked). Runs lazily on read;
 * the drawnAt: null filter guarantees exactly one draw even with many readers.
 */
async function settle(doc: ListingDoc, now: Date): Promise<ListingDoc> {
  if (doc.drawnAt || now < doc.endsAt) return doc;
  const { listings, picks } = await collections();
  const pool = (await picks.find({ listingId: doc._id }, { projection: { number: 1 } }).toArray()).map((p) => p.number);
  const drawn: number[] = [];
  while (drawn.length < winnerCountOf(doc) && pool.length) {
    drawn.push(pool.splice(randomInt(pool.length), 1)[0]);
  }
  const updated = await listings.findOneAndUpdate(
    { _id: doc._id, drawnAt: null },
    { $set: { winningNumbers: drawn, winningNumber: drawn[0] ?? null, drawnAt: now } },
    { returnDocument: "after", projection: NO_IMAGE_BYTES },
  );
  return updated ?? ((await listings.findOne({ _id: doc._id }, { projection: NO_IMAGE_BYTES })) as ListingDoc);
}

function summary(doc: ListingDoc, now: Date, pickCount: number): ListingSummary {
  return {
    slug: doc.slug,
    name: doc.name,
    ownerName: doc.ownerName ?? "",
    category: doc.category ?? "product",
    slots: slotsOf(doc),
    winnerCount: winnerCountOf(doc),
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
  const nameOf = new Map(all.map((p) => [p.number, p.name]));
  const mine = clientId ? all.find((p) => p.clientId === clientId) : undefined;
  // Until the draw is settled, everyone sees which numbers are gone but not who holds them.
  const drawn = doc.drawnAt !== null;
  const visible = drawn ? all : mine ? [mine] : [];
  return {
    ...summary(doc, now, all.length),
    picks: visible.map((p) => ({ number: p.number, name: p.name })),
    takenNumbers: all.map((p) => p.number),
    picksHidden: !drawn,
    myNumber: mine?.number ?? null,
    winners: winningNumbersOf(doc).map((n) => ({ number: n, name: nameOf.get(n) ?? "" })),
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

const ADMIN_LIMIT = 200;

/** Listings for the admin dashboard, newest first: this admin's, or everyone's. */
export async function listAdminListings(by: string | null): Promise<ClosedListing[]> {
  const { listings } = await collections();
  const docs = await listings
    .find(by ? { createdByKey: adminKey(by) } : {}, { projection: NO_IMAGE_BYTES })
    .sort({ createdAt: -1 })
    .limit(ADMIN_LIMIT)
    .toArray();
  return describe(docs, new Date());
}

/** One listing with everything the admin edit form needs, including the highest number held. */
export async function getAdminListing(slug: string): Promise<(ClosedListing & { highestPick: number }) | null> {
  const { listings, picks } = await collections();
  const doc = await listings.findOne({ slug }, { projection: NO_IMAGE_BYTES });
  if (!doc) return null;
  const [described] = await describe([doc], new Date());
  const highest = await picks.find({ listingId: doc._id }).sort({ number: -1 }).limit(1).next();
  return { ...described, highestPick: highest?.number ?? 0 };
}

/**
 * Summaries with pick counts, plus the winners for finished draws. Closed draws
 * nobody has opened since zero get their winners drawn here.
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

  const wanted = settled.flatMap((d) => winningNumbersOf(d).map((number) => ({ listingId: d._id, number })));
  const winnerPicks = wanted.length
    ? await picks.find({ $or: wanted }, { projection: { listingId: 1, number: 1, name: 1 } }).toArray()
    : [];
  const nameOf = new Map(winnerPicks.map((p) => [`${p.listingId.toHexString()}:${p.number}`, p.name]));

  return settled.map((d) => ({
    ...summary(d, now, countOf.get(d._id.toHexString()) ?? 0),
    winners: winningNumbersOf(d).map(
      (n): Winner => ({ number: n, name: nameOf.get(`${d._id.toHexString()}:${n}`) ?? "" }),
    ),
    createdBy: d.createdBy ?? "",
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

  const max = slotsOf(doc);
  const number = Number(input.number);
  if (!Number.isInteger(number) || number < MIN_NUMBER || number > max) {
    throw new ListingError(`Pick a whole number from ${MIN_NUMBER} to ${max}.`);
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
