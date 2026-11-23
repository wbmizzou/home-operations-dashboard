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

  // Expired or already-used link: Supabase redirects with an error instead of a code.
  if (searchParams.get("error") || searchParams.get("error_description")) return to("/login?confirm=expired");

  const code = searchParams.get("code");
  if (!code) return to("/login");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to("/login?confirm=done");
  // Signed in: the app sends them to the welcome step (which picks up any saved invite code).
  return to("/");
}
