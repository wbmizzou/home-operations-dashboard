"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";

type Factor = { id: string; friendly_name?: string; created_at: string };
type Pending = { id: string; qr: string; secret: string };

// Supabase returns the QR as `data:image/svg+xml;utf-8,<svg…>` with the SVG unescaped; encode it for <img>.
const qrSrc = (raw: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw.replace(/^data:image\/svg\+xml;utf-8,/, ""))}`;

/** Settings card: turn two-step sign-in (an authenticator app code) on or off. */
export default function MfaCard() {
  const router = useRouter();
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
    return data;
  }
  useEffect(() => {
    let live = true;
    createClient().auth.mfa.listFactors().then(({ data }) => { if (live) setFactors((data?.totp ?? []) as Factor[]); });
    return () => { live = false; };
  }, []);

  async function start() {
    setBusy(true); setError(null);
    // Clear out any half-finished setup from before, so the new one doesn't clash with it.
    const data = await load();
    for (const f of data?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data: enrolled, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !enrolled) return setError(friendlyError(error));
    setPending({ id: enrolled.id, qr: qrSrc(enrolled.totp.qr_code), secret: enrolled.totp.secret });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true); setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pending.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    setPending(null); setCode("");
    toast("Two-step sign-in is on");
    await load(); router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Turn off two-step sign-in? Your password alone will be enough to sign in again.")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return toast(`Couldn't turn it off: ${friendlyError(error)}`);
    toast("Two-step sign-in is off");
    await load(); router.refresh();
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg">Two-step sign-in</h2>
      {factors === null ? <p className="text-sm text-muted">…</p> : factors.length > 0 ? (
        <>
          <p className="text-sm text-muted">On. Signing in asks for a 6-digit code from your authenticator app, as well as your password.</p>
          <ul className="space-y-1 text-sm">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <span>{f.friendly_name || "Authenticator app"}</span>
                <button type="button" disabled={busy} onClick={() => remove(f.id)} className="text-sm text-berry underline">Turn off</button>
              </li>
            ))}
          </ul>
        </>
      ) : pending ? (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-muted">Scan this with an authenticator app (Apple Passwords, Google Authenticator, 1Password…), then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.qr} alt="QR code for your authenticator app" width={180} height={180} className="mx-auto rounded-xl bg-white p-2" />
          <p className="break-all text-center text-xs text-muted">Can&apos;t scan? Enter this key: <span className="font-mono">{pending.secret}</span></p>
          <input className="input text-center tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" required maxLength={8}
            value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="6-digit code" />
          {error && <p className="text-sm text-berry">{error}</p>}
          <div className="flex gap-2">
            <button className="btn inline-flex" disabled={busy}>{busy ? "…" : "Turn on"}</button>
            <button type="button" onClick={() => { setPending(null); setError(null); }} className="btn-quiet">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-muted">Off. Add a code from an authenticator app so a stolen password isn&apos;t enough to get into your household.</p>
          {error && <p className="text-sm text-berry">{error}</p>}
          <button type="button" onClick={start} disabled={busy} className="btn inline-flex">{busy ? "…" : "Set up two-step sign-in"}</button>
        </>
      )}
    </section>
  );
}
