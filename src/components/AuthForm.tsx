"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.replace("/"); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message.includes("database error") ? "That email isn't on the household list." : error.message);
      else if (data.session) { router.replace("/"); router.refresh(); }
      else setInfo("Check your email to confirm your account, then log in.");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-5xl">🌲</div>
        <h1 className="mt-3 text-3xl text-moss">Home Operations</h1>
        <p className="mt-1 text-sm text-muted">Projects, improvements &amp; maintenance</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <h2 className="text-xl">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <input className="input" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" required minLength={8} placeholder="Password (8+ characters)"
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-berry">{error}</p>}
        {info && <p className="text-sm text-moss">{info}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Log in" : "Sign up"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link href="/signup" className="text-moss underline">Create an account</Link></>
          : <>Have an account? <Link href="/login" className="text-moss underline">Log in</Link></>}
      </p>
    </div>
  );
}
