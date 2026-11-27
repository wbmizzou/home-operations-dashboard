"use client";
import Link from "next/link";
import InstallHint from "@/components/InstallHint";
import { Cottage } from "@/components/Whimsy";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { friendlyError } from "@/lib/errors";
import { INVITE_KEY, inviteCodeFrom } from "@/lib/inviteCode";

const CONFIRM_MESSAGES: Record<string, string> = {
  done: "Your email is confirmed ✓ Log in to continue.",
  expired: "That confirmation link has expired or was already used. Log in, or sign up again for a new link.",
};

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  // Invite links look like /signup?code=ABCD-1234-EFGH. Keep the code until the welcome step.
  const inviteCode = inviteCodeFrom(params.get("code"));
  const confirmMessage = CONFIRM_MESSAGES[params.get("confirm") ?? ""] ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaFactor, setMfaFactor] = useState<string | null>(null); // set when a 6-digit code is still needed
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (inviteCode) try { localStorage.setItem(INVITE_KEY, inviteCode); } catch {}
  }, [inviteCode]);

  // Signed in with a password but two-step sign-in is on (the proxy sends people here with ?mfa=1).
  useEffect(() => {
    if (mode === "login" && params.get("mfa") === "1") needsCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** If this session still needs the authenticator code, ask for it. Returns true when it does. */
  async function needsCode(): Promise<boolean> {
    const supabase = createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") return false;
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp[0];
    if (!factor) return false;
    setMfaFactor(factor.id);
    return true;
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactor) return;
    setBusy(true); setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: mfaFactor, code: otp.replace(/\s/g, "") });
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    router.replace(params.get("next") === "/reset-password" ? "/reset-password" : "/"); router.refresh();
  }

  async function cancelCode() {
    await createClient().auth.signOut();
    setMfaFactor(null); setOtp(""); setPassword("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyError(error));
      else if (!(await needsCode())) { router.replace("/"); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        // The confirmation email links back here to finish signing in (see app/auth/confirm).
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) setError(friendlyError(error));
      // Supabase answers a sign-up for an existing email with no identities (and sends no email).
      else if (data.user && data.user.identities?.length === 0) setInfo("That email already has an account. Log in instead, or tap “Forgot password?” on the login page if you don't remember the password.");
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
      {mfaFactor ? (
        <form onSubmit={submitCode} className="card space-y-3 p-5">
          <h2 className="text-xl">One more step 🔐</h2>
          <p className="text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
          <input className="input text-center tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} autoFocus
            value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" aria-label="6-digit code" />
          {error && <p className="text-sm text-berry">{error}</p>}
          <button className="btn inline-flex w-full" disabled={busy}>{busy ? "…" : "Verify"}</button>
          <button type="button" onClick={cancelCode} className="w-full text-center text-sm text-muted underline">Use a different account</button>
        </form>
      ) : (
      <form onSubmit={submit} className="card space-y-3 p-5">
        <h2 className="text-xl">{mode === "login" ? "Welcome home 🍂" : "Create your account 🌱"}</h2>
        {confirmMessage && <p className="rounded-xl bg-moss/10 p-2 text-sm text-moss">{confirmMessage}</p>}
        {inviteCode && <p className="rounded-xl bg-moss/10 p-2 text-sm text-moss">🔑 You&apos;ve been invited to a household (code {inviteCode}). {mode === "login" ? "Log in" : "Sign up"} and you&apos;ll join it next.</p>}
        <input className="input" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput className="input" required minLength={8} placeholder="Password (8+ characters)"
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-berry">{error}</p>}
        {info && <p className="text-sm text-moss">{info}</p>}
        <button className="btn inline-flex w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Step inside" : "Sign up"}</button>
        {mode === "login" && <Link href="/forgot" className="block text-center text-sm text-muted underline">Forgot password?</Link>}
      </form>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link href={inviteCode ? `/signup?code=${encodeURIComponent(inviteCode)}` : "/signup"} className="text-moss underline">Create an account</Link></>
          : <>Have an account? <Link href={inviteCode ? `/login?code=${encodeURIComponent(inviteCode)}` : "/login"} className="text-moss underline">Log in</Link></>}
      </p>
      <InstallHint />
    </div>
  );
}
