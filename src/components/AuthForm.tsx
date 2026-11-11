"use client";
import Link from "next/link";
import InstallHint from "@/components/InstallHint";
import { Cottage } from "@/components/Whimsy";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Invite links look like /signup?code=ABCD1234. Keep the code until the welcome step.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    setInviteCode(code.toUpperCase());
    try { localStorage.setItem("hh-invite-code", code.toUpperCase()); } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.replace("/"); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) { router.replace("/welcome"); router.refresh(); }
      else setInfo("Check your email to confirm your account, then log in.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="flex justify-center"><Cottage size={88} /></div>
        <h1 className="mt-3 text-3xl text-moss">Home Hollow</h1>
        <p className="mt-1 text-sm text-muted">A cozy home for projects &amp; upkeep</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <h2 className="text-xl">{mode === "login" ? "Welcome home 🍂" : "Create your account 🌱"}</h2>
        {inviteCode && <p className="rounded-xl bg-moss/10 p-2 text-sm text-moss">🔑 You&apos;ve been invited to a household (code {inviteCode}). {mode === "login" ? "Log in" : "Sign up"} and you&apos;ll join it next.</p>}
        <input className="input" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" required minLength={8} placeholder="Password (8+ characters)"
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-berry">{error}</p>}
        {info && <p className="text-sm text-moss">{info}</p>}
        <button className="btn inline-flex w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Step inside" : "Sign up"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link href={inviteCode ? `/signup?code=${inviteCode}` : "/signup"} className="text-moss underline">Create an account</Link></>
          : <>Have an account? <Link href={inviteCode ? `/login?code=${inviteCode}` : "/login"} className="text-moss underline">Log in</Link></>}
      </p>
      <InstallHint />
    </div>
  );
}
