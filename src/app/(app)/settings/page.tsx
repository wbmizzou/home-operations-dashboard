import { requireHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import SettingsPanel from "@/components/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const hh = await requireHousehold();
  const { data: { user } } = await (await createClient()).auth.getUser();
  return (
    <>
      <h1 className="text-3xl text-moss">⚙️ Settings</h1>
      <SettingsPanel household={hh.household} members={hh.members} myUserId={user?.id ?? ""} email={user?.email ?? ""} />
    </>
  );
}
