import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Pinged on a schedule (see vercel.json) so the free-tier Supabase project
// never goes a week without activity and gets paused.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically once the variable is set.
  // Without it, only the harmless keep-alive read runs (so the database still never gets paused);
  // the purge is skipped until the secret is configured.
  const secret = process.env.CRON_SECRET;
  if (secret && !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!secret) console.warn("keepalive: CRON_SECRET is not set; skipping purge. Set it in Vercel project settings.");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  // A trivial read. Row-level security returns nothing for an anonymous caller,
  // but the request still reaches the database, which is what counts as activity.
  const { error } = await supabase.from("categories").select("id").limit(1);
  // Also clear projects that have sat in Recently deleted for more than 30 days.
  const { error: purgeError } = secret ? await supabase.rpc("purge_deleted_projects") : { error: null };
  if (error || purgeError) console.error("keepalive failed", error ?? purgeError);

  const ok = !error && !purgeError;
  return NextResponse.json({ ok, at: new Date().toISOString() }, { status: ok ? 200 : 502 });
}
