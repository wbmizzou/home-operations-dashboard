import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the sign-up confirmation email lands. Supabase has already confirmed the address by the
 * time it redirects here with a one-time `code`; exchanging it signs the person in on this device.
 * If it was opened on a different device or browser (no matching sign-up there), the exchange
 * fails but the email is still confirmed, so we just ask them to log in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

  // Password reset links come back with next=/reset-password (only that page is allowed, so this
  // can't be used to send people elsewhere).
  const reset = searchParams.get("next") === "/reset-password";

  // Expired or already-used link: Supabase redirects with an error instead of a code.
  if (searchParams.get("error") || searchParams.get("error_description")) return to(reset ? "/forgot?link=expired" : "/login?confirm=expired");

  const code = searchParams.get("code");
  if (!code) return to(reset ? "/forgot" : "/login");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // A reset link only works in the browser that asked for it; a sign-up link has confirmed the email either way.
  if (error) return to(reset ? "/forgot?link=expired" : "/login?confirm=done");
  if (reset) return to("/reset-password");
  // Signed in: the app sends them to the welcome step (which picks up any saved invite code).
  return to("/");
}
