/**
 * Turns a Supabase/Postgres error into something safe and friendly to show people.
 * Raw database messages can name tables, constraints and triggers, so only our own
 * messages (raised on purpose in SQL functions) and Supabase Auth's user-facing
 * messages are shown as-is. Everything else is logged and replaced with plain words.
 */
type AnyError = { message: string; code?: string; name?: string } | null | undefined;

const BY_CODE: Record<string, string> = {
  "23505": "That already exists.",
  "23503": "That refers to something that no longer exists. Refresh and try again.",
  "23514": "Some of those details aren't valid. Check the form and try again.",
  "23502": "A required field is missing.",
  "22001": "One of those entries is too long.",
  "22P02": "One of those entries isn't in the right format.",
  "42501": "You don't have permission to do that.",
  PGRST116: "That item couldn't be found. It may have been deleted.",
};

export function friendlyError(error: AnyError): string {
  if (!error) return "Something went wrong. Please try again.";
  if (/fetch|network/i.test(error.message)) return "Couldn't reach the server. Check your connection and try again.";
  // Messages we raise ourselves in SQL (RAISE EXCEPTION) are written for people.
  if (error.code === "P0001") return error.message;
  // Supabase Auth errors ("Invalid login credentials", rate limits, weak password…) are user-facing.
  if (error.name?.startsWith("Auth")) return error.message;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  if (/row-level security/i.test(error.message)) return BY_CODE["42501"];
  console.error(error);
  return "Something went wrong. Please try again.";
}
