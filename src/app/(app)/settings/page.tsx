import { requireHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import SettingsPanel, { type Activity } from "@/components/SettingsPanel";
import PriorityEditor from "@/components/PriorityEditor";
import { nowMs } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const hh = await requireHousehold();
  const supabase = await createClient();
  const [{ data: { user } }, { data: activity }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("audit_log").select("id, actor_name, action, detail, at").order("at", { ascending: false }).limit(15),
  ]);
  return (
    <>
      <h1 className="text-3xl text-moss">⚙️ Settings</h1>
      <SettingsPanel household={hh.household} members={hh.members} myUserId={user?.id ?? ""} isOwner={hh.isOwner}
        email={user?.email ?? ""} activity={(activity ?? []) as Activity[]}
        inviteExpired={new Date(hh.household.invite_expires_at).getTime() <= nowMs()}>
        <PriorityEditor levels={hh.priorities} isOwner={hh.isOwner} />
      </SettingsPanel>
    </>
  );
}
