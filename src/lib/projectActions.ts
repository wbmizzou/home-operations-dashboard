"use client";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type Router = { refresh: () => void };

/** Move a project to Recently deleted (kept 30 days) and offer Undo. */
export async function softDeleteProject(id: string, title: string, router: Router): Promise<string | null> {
  const { error } = await createClient().from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return error.message;
  router.refresh();
  toast(`Deleted “${title}”`, { label: "Undo", run: () => restoreProject(id, title, router) });
  return null;
}

export async function restoreProject(id: string, title: string, router: Router) {
  const { error } = await createClient().from("projects").update({ deleted_at: null }).eq("id", id);
  if (error) { toast(`Couldn't restore: ${error.message}`); return; }
  router.refresh();
  toast(`Restored “${title}” ✓`);
}
