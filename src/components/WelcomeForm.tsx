"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cottage } from "@/components/Whimsy";

export const INVITE_KEY = "hh-invite-code";

/** First visit after sign-up: start a household, or join one with an invite code. */
export default function WelcomeForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"start" | "join">(initialCode ? "join" : "start");
  const [code, setCode] = useState(initialCode);
  const [homeName, setHomeName] = useState("");
  const [myName, setMyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An invite link opened before sign-up leaves its code here.
  useEffect(() => {
    if (initialCode) return;
    try { const saved = localStorage.getItem(INVITE_KEY); if (saved) { setCode(saved); setMode("join"); } } catch {}
  }, [initialCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = mode === "start"
      ? await supabase.rpc("create_household", { p_name: homeName, p_display_name: myName })
      : await supabase.rpc("join_household", { p_code: code, p_display_name: myName });
    if (error) { setError(error.message); setBusy(false); return; }
    try { localStorage.removeItem(INVITE_KEY); } catch {}
    router.replace("/"); router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const tab = (m: "start" | "join", label: string) => (
    <button type="button" onClick={() => { setMode(m); setError(null); }} aria-pressed={mode === m}
      className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold ${mode === m ? "bg-moss text-white" : "text-muted"}`}>{label}</button>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-6 text-center">
        <div className="flex justify-center"><Cottage size={88} /></div>
        <h1 className="mt-3 text-3xl text-moss">Welcome to Home Hollow</h1>
        <p className="mt-1 text-sm text-muted">Track projects, improvements and upkeep for your home.</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="flex gap-1 rounded-full border border-line p-1">{tab("start", "🏡 Start new")}{tab("join", "🔑 Join one")}</div>
        {mode === "start" ? (
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Name your home</span>
            <input className="input" required maxLength={80} value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder="e.g. The Maple Street House" /></label>
        ) : (
          <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Invite code</span>
            <input className="input uppercase tracking-widest" required maxLength={12} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="8 letters & numbers" autoCapitalize="characters" /></label>
        )}
        <label className="block"><span className="mb-1 block text-sm font-medium text-muted">Your name <span className="font-normal">(shown as project owner)</span></span>
          <input className="input" required maxLength={40} value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="e.g. Sam" /></label>
        {mode === "join" && <p className="text-xs text-muted">Ask someone in the household for the code (Settings → Invite). You&apos;ll see all of their projects.</p>}
        {error && <p className="text-sm text-berry">{error}</p>}
        <button className="btn inline-flex w-full" disabled={busy}>{busy ? "…" : mode === "start" ? "Create my household" : "Join household"}</button>
      </form>
      <button type="button" onClick={signOut} className="mt-4 text-center text-sm text-muted underline">Sign out</button>
    </div>
  );
}
