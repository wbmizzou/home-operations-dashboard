// Tiny app-wide toast: call toast("Saved ✓") from any client component. The <Toaster />
// lives in the app layout, so a toast survives client-side navigation.
export type ToastAction = { label: string; run: () => void | Promise<void> };
export type ToastDetail = { message: string; action?: ToastAction; ms?: number };

export function toast(message: string, action?: ToastAction, ms = action ? 7000 : 3000) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("hh-toast", { detail: { message, action, ms } }));
}
