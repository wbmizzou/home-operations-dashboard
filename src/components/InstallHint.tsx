"use client";
import { useBrowserValue } from "@/lib/useBrowserValue";

function needsHint() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

/** iOS has no install button, so explain it once on the login page (Safari, not yet installed). */
export default function InstallHint() {
  const show = useBrowserValue(needsHint, false);
  if (!show) return null;
  return (
    <p className="card mx-auto mt-6 max-w-sm p-4 text-center text-sm text-muted">
      📲 To install: tap the <b>Share</b> button, then <b>Add to Home Screen</b>.
    </p>
  );
}
