export const MIN_NUMBER = 1;
export const DEFAULT_SLOTS = 50;
export const MIN_SLOTS = 2;
export const MAX_SLOTS = 200;
export const MAX_WINNERS = 20;
export const DEFAULT_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 24 * 60;
export const MAX_NAME_LENGTH = 80;
export const MAX_OWNER_NAME_LENGTH = 60;

export type ListingStatus = "scheduled" | "live" | "ended";

export const CATEGORIES = ["product", "service", "food"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABELS: Record<Category, string> = { product: "Product", service: "Service", food: "Food" };

export type ListingSummary = {
  slug: string;
  name: string;
  ownerName: string;
  category: Category;
  /** Numbers on the board run 1..slots. */
  slots: number;
  /** 1 = one winner takes all; more = that many different numbers are drawn. */
  winnerCount: number;
  hasImage: boolean;
  imageVersion: number;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: ListingStatus;
  pickCount: number;
};

/** Drawn in order: the first is first place. */
export type Winner = { number: number; name: string };

export type ClosedListing = ListingSummary & {
  winners: Winner[];
  createdBy: string;
};

export type PublicListing = ListingSummary & {
  /** Before the draw: only the viewer's own pick. After: everyone's. */
  picks: { number: number; name: string }[];
  /** Every claimed number, without names, so the board can grey them out during the draw. */
  takenNumbers: number[];
  /** True until the draw: names stay hidden. */
  picksHidden: boolean;
  myNumber: number | null;
  winners: Winner[];
  drawn: boolean;
  serverNow: string;
};

export function imageUrl(l: Pick<ListingSummary, "slug" | "imageVersion">) {
  return `/api/listings/${l.slug}/image?v=${l.imageVersion}`;
}

export function winnersLabel(count: number) {
  return count === 1 ? "One winner takes all" : `${count} winners`;
}
