"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cottage } from "@/components/Whimsy";
import { friendlyError } from "@/lib/errors";
import { INVITE_KEY, inviteCodeFrom } from "@/lib/inviteCode";
import { useLocalStorage } from "@/lib/useBrowserValue";

type Preview = { code: string; household: string; owner: string | null };
const BAD_CODE = "That invite code doesn't match a household, or it has expired or already been used. Ask for a fresh invite link.";
/** Whose household an invite code belongs to, or why it can't be used. */
async function lookUp(code: string): Promise<{ preview: Preview } | { error: string }> {
  const { data, error } = await createClient().rpc("preview_invite", { p_code: code });
  if (error) return { error: friendlyError(error) };
  const row = (data as { household_name: string; owner_name: string | null }[] | null)?.[0];
  return row ? { preview: { code, household: row.household_name, owner: row.owner_name } } : { error: BAD_CODE };
}
const same = (a: string, b: string) => a.replace(/[^0-9A-Z]/gi, "").toUpperCase() === b.replace(/[^0-9A-Z]/gi, "").toUpperCase();

/**
 * First visit after sign-up: start a household, or join one with an invite code. Joining is two
 * steps: check the code and see whose household it is, then join, so a link from a stranger can't
 * quietly put someone's projects into the wrong household.
 */
export default function WelcomeForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  // An invite link opened before sign-up leaves its code on this device.
  const [savedCode, setSavedCode] = useLocalStorage(INVITE_KEY);
  const linkCode = inviteCodeFrom(initialCode) ?? inviteCodeFrom(savedCode) ?? "";
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const code = typedCode ?? linkCode;
  const [modeChoice, setModeChoice] = useState<"start" | "join" | null>(null);
  const mode = modeChoice ?? (code ? "join" : "start");
  const [homeName, setHomeName] = useState("");
  const [myName, setMyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const checked = preview && same(preview.code, code) ? preview : null;

  function show(result: Awaited<ReturnType<typeof lookUp>>) {
    if ("error" in result) setError(result.error);
    else { setError(null); setPreview(result.preview); }
  }

  // A code from a link: look it up straight away so they see whose household it is.
  useEffect(() => {
    if (!linkCode) return;
    let live = true;
    lookUp(linkCode).then((result) => { if (live) show(result); });
    return () => { live = false; };
  }, [linkCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    if (mode === "join" && !checked) { show(await lookUp(code)); setBusy(false); return; }
    const supabase = createClient();
    const { data, error } = mode === "start"
      ? await supabase.rpc("create_household", { p_name: homeName, p_display_name: myName })
      : await supabase.rpc("join_household", { p_code: code, p_display_name: myName });
    if (error) { setError(friendlyError(error)); setBusy(false); return; }
    // join_household returns null (not an error) for a wrong, used or expired code.
    if (!data) { setError(BAD_CODE); setPreview(null); setBusy(false); return; }
    setSavedCode(null);
    router.replace("/"); router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const tab = (m: "start" | "join", label: string) => (
    <button type="button" onClick={() => { setModeChoice(m); setError(null); }} aria-pressed={mode === m}
      className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors duration-150 ${mode === m ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(31,27,22,0.08)]" : "text-muted hover:text-ink"}`}>{label}</button>
  );

  const label = mode === "start" ? "Create my household" : checked ? `Join ${checked.household}` : "Check code";
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <div className="flex justify-center"><Cottage size={88} /></div>
        <h1 className="font-display mt-3 text-3xl">Welcome to Home Hollow</h1>
        <p className="mt-1 text-sm text-muted">Track projects, improvements and upkeep for your home.</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="flex gap-1 rounded-[10px] bg-raised p-1">{tab("start", "Start new")}{tab("join", "Join one")}</div>
        {mode === "start" ? (
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Name your home</span>
            <input className="input" required maxLength={80} value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder="e.g. The Maple Street House" /></label>
        ) : (
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Invite code</span>
            <input className="input uppercase tracking-widest" required maxLength={16} value={code} onChange={(e) => { setTypedCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" /></label>
        )}
        {mode === "join" && checked && (
          <div className="rounded-xl border border-moss/40 bg-moss/10 p-3 text-sm">
            <div>You&apos;re joining <b className="font-display text-base">{checked.household}</b>{checked.owner ? <> ({checked.owner}&apos;s household)</> : null}.</div>
            <div className="mt-1 text-xs text-muted">Don&apos;t recognise it? Don&apos;t join. Ask the person who invited you for a fresh link.</div>
          </div>
        )}
        {(mode === "start" || checked) && (
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Your name <span className="font-normal">(shown as project owner)</span></span>
            <input className="input" required maxLength={40} value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="e.g. Sam" /></label>
        )}
        {mode === "join" && !checked && <p className="text-xs text-muted">Ask someone in the household for the code (Settings → Invite). You&apos;ll see and edit all of their projects, so only join a household you know.</p>}
        {error && <p className="text-sm text-berry">{error}</p>}
        <button className="btn inline-flex w-full" disabled={busy}>{busy ? "…" : label}</button>
      </form>
      <button type="button" onClick={signOut} className="mt-4 text-center text-sm text-muted underline">Sign out</button>
    </div>
  );
}
