import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Where sign-up confirmation and password reset emails land.
 *
 * Preferred: the email templates link here with ?token_hash=…&type=…, which works in any browser
 * (including the one built into Gmail), because nothing has to match the browser that asked.
 *
 * Older emails: Supabase has already confirmed the address by the
 * time it redirects here with a one-time `code`; exchanging it signs the person in on this device.
 * If it was opened on a different device or browser (no matching sign-up there), the exchange
 * fails but the email is still confirmed, so we just ask them to log in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

  // Password reset links come back with next=/reset-password (only that page is allowed, so this
  // can't be used to send people elsewhere).
  const type = searchParams.get("type") as EmailOtpType | null;
  const reset = searchParams.get("next") === "/reset-password" || type === "recovery";

  // Expired or already-used link: Supabase redirects with an error instead of a code.
  if (searchParams.get("error") || searchParams.get("error_description")) return to(reset ? "/forgot?link=expired" : "/login?confirm=expired");

  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return to(reset ? "/forgot?link=expired" : "/login?confirm=expired");
    return to(reset ? "/reset-password" : "/");
  }

  const code = searchParams.get("code");
  if (!code) return to(reset ? "/forgot" : "/login");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // A reset link only works in the browser that asked for it; a sign-up link has confirmed the email either way.
  if (error) return to(reset ? "/forgot?link=expired" : "/login?confirm=done");
  if (reset) return to("/reset-password");
  // Signed in: the app sends them to the welcome step (which picks up any saved invite code).
  return to("/");
}
