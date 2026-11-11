import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeletedList from "@/components/DeletedList";

export const dynamic = "force-dynamic";

export default async function RecentlyDeleted() {
  const supabase = await createClient();
  await supabase.rpc("purge_deleted_projects"); // clear out anything past 30 days
  const { data } = await supabase.from("projects").select("id, title, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  return (
    <>
      <Link href="/projects" className="text-sm text-muted">← All projects</Link>
      <h1 className="mt-1 text-3xl text-moss">🗑️ Recently deleted</h1>
      <p className="text-sm text-muted">Deleted projects wait here for 30 days, then they&apos;re removed for good.</p>
      <DeletedList items={(data ?? []) as { id: string; title: string; deleted_at: string }[]} />
    </>
  );
}
