"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBrowserValue } from "@/lib/useBrowserValue";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import ThemeToggle from "@/components/ThemeToggle";
import MfaCard from "@/components/MfaCard";
import type { Household, Member } from "@/lib/household";
import { friendlyError } from "@/lib/errors";

export type Activity = { id: number; actor_name: string | null; action: string; detail: string | null; at: string };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-3 p-5"><h2 className="text-lg">{title}</h2>{children}</section>;
}

/** ABCD1234EFGH → ABCD-1234-EFGH (easier to read out; dashes are ignored when joining). */
const pretty = (code: string) => (code.length === 12 ? code.match(/.{4}/g)!.join("-") : code);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function SettingsPanel({ household, members, myUserId, isOwner, email, activity, inviteExpired, children }:
  { household: Household; members: Member[]; myUserId: string; isOwner: boolean; email: string; activity: Activity[]; inviteExpired: boolean; children?: React.ReactNode }) {
  const router = useRouter();
  const me = members.find((m) => m.user_id === myUserId);
  const [homeName, setHomeName] = useState(household.name);
  const [myName, setMyName] = useState(me?.display_name ?? "");
  const [code, setCode] = useState(household.invite_code);
  const expires = household.invite_expires_at; // refreshed from the server after a new code
  const origin = useBrowserValue(() => window.location.origin, "");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(false); // a code made on this page is valid even before the refresh lands
  const expired = !fresh && inviteExpired;
  const link = `${origin}/signup?code=${code}`;
  const supabase = createClient();
  const owner = members.find((m) => m.role === "owner");

  async function saveHome(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("households").update({ name: homeName.trim() }).eq("id", household.id).select("id");
    if (error) return toast(`Couldn't save: ${friendlyError(error)}`);
    if (!data?.length) return toast("Only the household owner can rename it");
    toast("Household name saved ✓"); router.refresh();
  }
  async function saveMe(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("household_members").update({ display_name: myName.trim() }).eq("user_id", myUserId);
    if (error) return toast(`Couldn't save: ${friendlyError(error)}`);
    toast("Your name saved ✓ — existing projects keep their old owner name until edited"); router.refresh();
  }
  async function share() {
    const text = `Join our home on Home Hollow: ${link} (invite code ${pretty(code)}, works once, until ${shortDate(expires)})`;
    try {
      if (navigator.share) await navigator.share({ title: "Home Hollow invite", text, url: link });
      else { await navigator.clipboard.writeText(text); toast("Invite copied ✓"); }
    } catch { /* share sheet dismissed */ }
  }
  async function newCode() {
    if (!expired && !window.confirm("Make a new invite code? The old code and link will stop working.")) return;
    const { data, error } = await supabase.rpc("regenerate_invite_code");
    if (error) return toast(`Couldn't change code: ${friendlyError(error)}`);
    setCode(data as string); setFresh(true);
    toast("New invite code ready ✓"); router.refresh();
  }
  async function removeMember(m: Member) {
    if (!window.confirm(`Remove ${m.display_name} from ${household.name}? They'll lose access to all of its projects straight away.`)) return;
    const { error } = await supabase.rpc("remove_member", { p_user_id: m.user_id });
    if (error) return toast(`Couldn't remove: ${friendlyError(error)}`);
    toast(`${m.display_name} removed`); router.refresh();
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login"); router.refresh();
  }
  async function deleteAccount() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); return toast(`Couldn't delete: ${friendlyError(error)}`); }
    await supabase.auth.signOut().catch(() => {});
    router.replace("/login"); router.refresh();
  }

  const lastOne = members.length === 1;
  return (
    <div className="mt-6 space-y-4">
      <Card title="🏡 Household">
        {isOwner ? (
          <form onSubmit={saveHome} className="flex gap-2">
            <input className="input" value={homeName} onChange={(e) => setHomeName(e.target.value)} maxLength={80} required aria-label="Household name" />
            <button className="btn inline-flex shrink-0">Save</button>
          </form>
        ) : <p className="font-display text-xl">{household.name}</p>}
        <div>
          <div className="mb-1 text-sm font-medium text-muted">Members</div>
          <ul className="space-y-1 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3">
                <span>👤 {m.display_name}{m.user_id === myUserId ? " (you)" : ""}{m.role === "owner" ? " · owner" : ""}</span>
                {isOwner && m.user_id !== myUserId && (
                  <button type="button" onClick={() => removeMember(m)} className="text-xs text-berry underline">Remove</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card title="🔑 Invite someone to your household">
        <p className="text-sm text-muted">They&apos;ll see and edit all of this household&apos;s projects. Each code works for one person and expires after 14 days.</p>
        {expired ? (
          <p className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
            This invite code has expired or been used. {isOwner ? "Make a new one below." : `Ask ${owner?.display_name ?? "the owner"} to make a new one.`}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3">
            <div className="min-w-0">
              <div className="font-display text-xl tracking-[0.12em]">{pretty(code)}</div>
              <div className="text-xs text-muted">Works once · expires {shortDate(expires)}</div>
            </div>
            <button type="button" onClick={share} className="btn inline-flex shrink-0">Share invite</button>
          </div>
        )}
        {isOwner && <button type="button" onClick={newCode} className="text-sm text-muted underline">Make a new code{expired ? "" : " (stops the old one)"}</button>}
      </Card>

      {children}

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

      <Card title="🔑 Password">
        <p className="text-sm text-muted">Change the password you use to log in.</p>
        <Link href="/reset-password" className="inline-flex rounded-full border-2 border-moss px-4 py-2 text-sm font-semibold text-moss">Change password</Link>
      </Card>
      <MfaCard />

      <Card title="📜 Recent activity">
        {activity.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
          <ul className="space-y-1 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span className="min-w-0"><b>{a.actor_name ?? "Someone"}</b> {a.action}{a.detail && a.action !== "joined" ? <> · <span className="text-muted">{a.detail}</span></> : null}</span>
                <span className="shrink-0 text-xs text-muted">{shortDate(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="⚠️ Delete my account">
        <p className="text-sm text-muted">
          {lastOne
            ? "You're the only member, so this also permanently deletes this household and every project, category and service log in it."
            : `You'll leave this household; its projects stay with the other members.${isOwner ? " The longest-standing member becomes the owner." : ""}`} This can&apos;t be undone.
        </p>
        <label className="block"><span className="mb-1 block text-sm text-muted">Type DELETE to confirm</span>
          <input className="input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} autoCapitalize="characters" /></label>
        <button type="button" disabled={confirmDelete !== "DELETE" || busy} onClick={deleteAccount}
          className="rounded-full bg-berry px-4 py-2.5 font-semibold text-white disabled:opacity-40">{busy ? "Deleting…" : "Delete my account"}</button>
      </Card>
    </div>
  );
}
