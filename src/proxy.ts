import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthCode } from "@/lib/inviteCode";

// Exact paths (or their sub-paths) that don't need a signed-in user.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot", "/auth/confirm", "/api/keepalive"];
const AUTH_PAGES = ["/login", "/signup", "/forgot"];
const under = (path: string, p: string) => path === p || path.startsWith(`${p}/`);

/** A strict, per-request Content-Security-Policy. Next.js adds the nonce to its own scripts. */
function contentSecurityPolicy(nonce: string) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const realtime = supabase.replace(/^https:/, "wss:");
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (React style={…}) can't carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${realtime}`.trim(),
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  // A sign-up confirmation link that fell back to the site's home page (?code=<uuid>, or an error for
  // an expired link): finish it on /auth/confirm before anything mistakes the code for an invite code.
  const params = request.nextUrl.searchParams;
  if (request.nextUrl.pathname !== "/auth/confirm" && (isAuthCode(params.get("code")) || params.has("error_description"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  // Rebuilt whenever Supabase refreshes the session cookies, so the page sees the new ones.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };
  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => under(path, p));
  const isAuthPage = AUTH_PAGES.some((p) => under(path, p));

  const redirect = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c)); // keep any refreshed session
    return r;
  };

  if (!data.user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirect(url);
  }

  if (data.user) {
    // Two-step sign-in is on but this session only used a password: finish it on the login page.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsCode = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    if (needsCode && !under(path, "/login") && !under(path, "/auth/signout") && !under(path, "/api/keepalive")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // After the code, come back to setting a new password if that's where they were going.
      url.search = under(path, "/reset-password") ? "?mfa=1&next=/reset-password" : "?mfa=1";
      return redirect(url);
    }
    if (isAuthPage && !needsCode) {
      // Already signed in: an invite link goes straight to the join step, keeping its code.
      const url = request.nextUrl.clone();
      const code = url.searchParams.get("code");
      url.pathname = code ? "/welcome" : "/";
      url.search = code ? `?code=${encodeURIComponent(code)}` : "";
      return redirect(url);
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except build assets and the few public files that must load signed out.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|sw.js|offline.html|manifest.webmanifest).*)"],
};
