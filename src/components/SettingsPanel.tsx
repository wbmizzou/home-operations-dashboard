"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import ThemeToggle from "@/components/ThemeToggle";
import type { Household, Member } from "@/lib/household";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-3 p-5"><h2 className="text-lg">{title}</h2>{children}</section>;
}

export default function SettingsPanel({ household, members, myUserId, email }: { household: Household; members: Member[]; myUserId: string; email: string }) {
  const router = useRouter();
  const me = members.find((m) => m.user_id === myUserId);
  const [homeName, setHomeName] = useState(household.name);
  const [myName, setMyName] = useState(me?.display_name ?? "");
  const [code, setCode] = useState(household.invite_code);
  const [origin, setOrigin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/signup?code=${code}`;
  const supabase = createClient();

  async function saveHome(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("households").update({ name: homeName.trim() }).eq("id", household.id);
    if (error) return toast(`Couldn't save: ${error.message}`);
    toast("Household name saved ✓"); router.refresh();
  }
  async function saveMe(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("household_members").update({ display_name: myName.trim() }).eq("user_id", myUserId);
    if (error) return toast(`Couldn't save: ${error.message}`);
    toast("Your name saved ✓ — existing projects keep their old owner name until edited"); router.refresh();
  }
  async function share() {
    const text = `Join our home on Home Hollow: ${link} (invite code ${code})`;
    try {
      if (navigator.share) await navigator.share({ title: "Home Hollow invite", text, url: link });
      else { await navigator.clipboard.writeText(text); toast("Invite copied ✓"); }
    } catch { /* share sheet dismissed */ }
  }
  async function newCode() {
    if (!window.confirm("Make a new invite code? The old code and link will stop working.")) return;
    const { data, error } = await supabase.rpc("regenerate_invite_code");
    if (error) return toast(`Couldn't change code: ${error.message}`);
    setCode(data as string); toast("New invite code ready ✓");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login"); router.refresh();
  }
  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); return toast(`Couldn't delete: ${error.message}`); }
    await supabase.auth.signOut().catch(() => {});
    router.replace("/login"); router.refresh();
  }

  const lastOne = members.length === 1;
  return (
    <div className="mt-6 space-y-4">
      <Card title="🏡 Household">
        <form onSubmit={saveHome} className="flex gap-2">
          <input className="input" value={homeName} onChange={(e) => setHomeName(e.target.value)} maxLength={80} required aria-label="Household name" />
          <button className="btn inline-flex shrink-0">Save</button>
        </form>
        <div>
          <div className="mb-1 text-sm font-medium text-muted">Members</div>
          <ul className="space-y-1 text-sm">
            {members.map((m) => <li key={m.user_id}>👤 {m.display_name}{m.user_id === myUserId ? " (you)" : ""}{m.role === "owner" ? " · owner" : ""}</li>)}
          </ul>
        </div>
      </Card>

      <Card title="🔑 Invite someone to your household">
        <p className="text-sm text-muted">They&apos;ll see and edit all of this household&apos;s projects. Share the link, or give them the code to enter after signing up.</p>
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3">
          <span className="font-display text-2xl tracking-[0.2em]">{code}</span>
          <button type="button" onClick={share} className="btn inline-flex shrink-0">Share invite</button>
        </div>
        <button type="button" onClick={newCode} className="text-sm text-muted underline">Make a new code (stops the old one)</button>
      </Card>

      <Card title="👤 You">
        <form onSubmit={saveMe} className="flex gap-2">
          <input className="input" value={myName} onChange={(e) => setMyName(e.target.value)} maxLength={40} required aria-label="Your name" />
          <button className="btn inline-flex shrink-0">Save</button>
        </form>
        <p className="text-xs text-muted">Signed in as {email}</p>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button type="button" onClick={signOut} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Sign out</button>
        </div>
      </Card>

      <Card title="⚠️ Delete my account">
        <p className="text-sm text-muted">
          {lastOne
            ? "You're the only member, so this also permanently deletes this household and every project, category and service log in it."
            : "You'll leave this household; its projects stay with the other members."} This can&apos;t be undone.
        </p>
        <label className="block"><span className="mb-1 block text-sm text-muted">Type DELETE to confirm</span>
          <input className="input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} autoCapitalize="characters" /></label>
        <button type="button" disabled={confirmDelete !== "DELETE" || busy} onClick={deleteAccount}
          className="rounded-full bg-berry px-4 py-2.5 font-semibold text-white disabled:opacity-40">{busy ? "Deleting…" : "Delete my account"}</button>
      </Card>
    </div>
  );
}
