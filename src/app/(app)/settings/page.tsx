import { requireHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import SettingsPanel, { type Activity } from "@/components/SettingsPanel";
import PriorityEditor from "@/components/PriorityEditor";
import CategoryEditor from "@/components/CategoryEditor";
import { nowMs } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const hh = await requireHousehold();
  const supabase = await createClient();
  const [{ data: { user } }, { data: activity }, { data: cats }, { data: used }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("audit_log").select("id, actor_name, action, detail, at").order("at", { ascending: false }).limit(15),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("category_id").is("deleted_at", null).not("category_id", "is", null),
  ]);
  const categories = (cats ?? []).map((c) => ({ ...c, count: (used ?? []).filter((u) => u.category_id === c.id).length }));
  return (
    <>
      <h1 className="text-3xl text-moss">⚙️ Settings</h1>
      <SettingsPanel household={hh.household} members={hh.members} myUserId={user?.id ?? ""} isOwner={hh.isOwner}
        email={user?.email ?? ""} activity={(activity ?? []) as Activity[]}
        inviteExpired={new Date(hh.household.invite_expires_at).getTime() <= nowMs()}>
        <CategoryEditor categories={categories} isOwner={hh.isOwner} />
        <PriorityEditor levels={hh.priorities} isOwner={hh.isOwner} />
      </SettingsPanel>
    </>
  );
}
