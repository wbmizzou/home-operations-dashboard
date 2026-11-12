import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Household = { id: string; name: string; hero: "cottage" | "hollow"; invite_code: string };
export type Member = { user_id: string; display_name: string; role: "owner" | "member" };
export type HouseholdContext = { household: Household; members: Member[]; me: string | null; owners: string[] };

/**
 * The signed-in person's household, members and owner choices (cached per request).
 * Returns null when they don't belong to one yet; a pending email invite is claimed first.
 */
export const getHousehold = cache(async (): Promise<HouseholdContext | null> => {
  const supabase = await createClient();
  const load = () => supabase.from("households").select("id, name, hero, invite_code").maybeSingle();
  let { data: household } = await load();
  if (!household) {
    const { data: claimed } = await supabase.rpc("claim_email_invite");
    if (claimed) ({ data: household } = await load());
  }
  if (!household) return null;

  const [{ data: members }, { data: me }, { data: used }] = await Promise.all([
    supabase.from("household_members").select("user_id, display_name, role").order("joined_at"),
    supabase.rpc("current_owner"),
    supabase.from("projects").select("owner").not("owner", "is", null),
  ]);
  const names = (members ?? []).map((m) => m.display_name);
  const usedOwners = [...new Set((used ?? []).map((r) => r.owner as string))];
  // Members first, then "Joint" for shared work, then any older owner names still on projects.
  const owners = [...new Set([...names, ...(names.length > 1 || usedOwners.includes("Joint") ? ["Joint"] : []), ...usedOwners])];
  return { household: household as Household, members: (members ?? []) as Member[], me: (me as string | null) ?? null, owners };
});

/**
 * For pages inside the app: the household, or a redirect to the welcome step.
 * Pages render alongside the layout, so each page must check for itself rather than
 * rely on the layout's redirect (otherwise a brand-new account crashes on first visit).
 */
export async function requireHousehold(): Promise<HouseholdContext> {
  const hh = await getHousehold();
  if (!hh) redirect("/welcome");
  return hh;
}
