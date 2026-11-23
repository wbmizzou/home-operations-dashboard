const DAY = 864e5;

/** Today (or `days` from today) as YYYY-MM-DD. For server components, which render once per request. */
export function isoDate(days = 0): string {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

/** The current time in ms. For server components, which render once per request. */
export function nowMs(): number {
  return Date.now();
}

/** Whole days left before something deleted at `deletedAt` is purged after `keepDays`. */
export function daysLeft(deletedAt: string, keepDays = 30): number {
  return Math.max(0, keepDays - Math.floor((Date.now() - new Date(deletedAt).getTime()) / DAY));
}
