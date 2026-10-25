export const MIN_NUMBER = 1;
export const MAX_NUMBER = 50;
export const DEFAULT_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 24 * 60;
export const MAX_NAME_LENGTH = 80;
export const MAX_OWNER_NAME_LENGTH = 60;

export type ListingStatus = "scheduled" | "live" | "ended";

export type ListingSummary = {
  slug: string;
  name: string;
  ownerName: string;
  hasImage: boolean;
  imageVersion: number;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: ListingStatus;
  pickCount: number;
};

export type PublicListing = ListingSummary & {
  /** Before the draw: only the viewer's own pick. After: everyone's. */
  picks: { number: number; name: string }[];
  picksHidden: boolean;
  myNumber: number | null;
  winningNumber: number | null;
  winnerName: string | null;
  drawn: boolean;
  serverNow: string;
};

export function imageUrl(l: Pick<ListingSummary, "slug" | "imageVersion">) {
  return `/api/listings/${l.slug}/image?v=${l.imageVersion}`;
}
