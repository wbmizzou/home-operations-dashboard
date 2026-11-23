/**
 * Both invite links (/signup?code=ABCD-1234-EFGH) and Supabase's email-confirmation links
 * (/?code=<uuid>) use a `code` query parameter. Confirmation codes are UUIDs; invite codes never are.
 */
export function isAuthCode(code: string | null | undefined): boolean {
  return !!code && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code.trim());
}

/** The invite code in a URL or saved value, ignoring confirmation codes. */
export function inviteCodeFrom(code: string | null | undefined): string | null {
  return code && !isAuthCode(code) ? code.trim().toUpperCase() : null;
}

/** Where an invite code from a link waits (on this device) until the welcome step. */
export const INVITE_KEY = "hh-invite-code";
