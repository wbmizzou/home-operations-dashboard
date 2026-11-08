import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Pinged on a schedule (see vercel.json) so the free-tier Supabase project
// never goes a week without activity and gets paused.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  // A trivial read. Row-level security returns nothing for an anonymous caller,
  // but the request still reaches the database, which is what counts as activity.
  const { error } = await supabase.from("categories").select("id").limit(1);

  return NextResponse.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 502 : 200 });
}
