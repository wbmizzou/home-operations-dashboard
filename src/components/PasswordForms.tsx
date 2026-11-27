"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Cottage } from "@/components/Whimsy";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { friendlyError } from "@/lib/errors";

function Shell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="flex justify-center"><Cottage size={88} /></div>
        <h1 className="mt-3 text-3xl text-moss">Home Hollow</h1>
      </div>
      {children}
      {footer && <p className="mt-4 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}

/** "Forgot password?": emails a link that signs you in and opens the new-password page. */
export function ForgotForm() {
  const params = useSearchParams();
  const expired = params.get("link") === "expired";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setBusy(false);
    // Don't reveal whether an account exists; only show real problems like rate limits.
    if (error && !/not found|no user/i.test(error.message)) { setError(friendlyError(error)); return; }
    setSent(true);
  }

  return (
    <Shell footer={<>Remembered it? <Link href="/login" className="text-moss underline">Log in</Link></>}>
      {sent ? (
        <div className="card space-y-3 p-5">
          <h2 className="text-xl">Check your email 📬</h2>
          <p className="text-sm text-muted">
            If <b className="text-ink">{email.trim()}</b> has a Home Hollow account, a link to set a new password is on its way.
            It can take a minute; check spam too. The link works once and expires after an hour.
          </p>
          <button type="button" onClick={() => setSent(false)} className="text-sm text-moss underline">Use a different email</button>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-3 p-5">
          <h2 className="text-xl">Forgot your password? 🗝️</h2>
          {expired && <p className="rounded-xl bg-berry/10 p-2 text-sm text-berry">That reset link has expired, was already used, or was opened on a different device or browser. Ask for a new one below.</p>}
          <p className="text-sm text-muted">Enter your email and we&apos;ll send a link to set a new one.</p>
          <input className="input" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-berry">{error}</p>}
          <button className="btn inline-flex w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </Shell>
  );
}

/** Set a new password (after a reset link, or from Settings while signed in). */
export function NewPasswordForm() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== again) { setError("The two passwords don't match."); return; }
    setBusy(true); setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(/different from the old/i.test(error.message) ? "That's your current password. Pick a new one." : friendlyError(error));
      return;
    }
    setDone(true);
  }

  if (done) return (
    <Shell>
      <div className="card space-y-3 p-5">
        <h2 className="text-xl">Password changed ✓</h2>
        <p className="text-sm text-muted">Use your new password next time you log in, on any device.</p>
        <button type="button" onClick={() => { router.replace("/"); router.refresh(); }} className="btn inline-flex w-full">Go home</button>
      </div>
    </Shell>
  );

  return (
    <Shell footer={<Link href="/" className="text-moss underline">Cancel</Link>}>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <h2 className="text-xl">Set a new password 🔑</h2>
        <PasswordInput className="input" required minLength={8} placeholder="New password (8+ characters)" autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" autoFocus />
        <PasswordInput className="input" required minLength={8} placeholder="Type it again" autoComplete="new-password"
          value={again} onChange={(e) => setAgain(e.target.value)} aria-label="Confirm new password" />
        {error && <p role="alert" className="text-sm text-berry">{error}</p>}
        <button className="btn inline-flex w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </Shell>
  );
}
