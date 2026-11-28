"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hammer, House, Plus, Repeat, Settings, type LucideIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { AcornMark } from "@/components/Whimsy";

const ITEMS: { href: string; label: string; icon: LucideIcon; mobile: boolean }[] = [
  { href: "/", label: "Dashboard", icon: House, mobile: true },
  { href: "/projects", label: "Projects", icon: Hammer, mobile: true },
  { href: "/upkeep", label: "Upkeep", icon: Repeat, mobile: true },
  { href: "/projects/new", label: "Add project", icon: Plus, mobile: false }, // phones use the floating + instead
  { href: "/settings", label: "Settings", icon: Settings, mobile: true },
];
// Pages where the floating "add project" button appears on phones.
const FAB_PAGES = ["/", "/projects", "/upkeep"];

export default function Nav({ householdName }: { householdName: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || (href === "/projects" && path.startsWith("/projects") && path !== "/projects/new"));
  return (
    <>
      {/* Desktop side nav */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface px-3 pb-4 pt-5 md:flex">
        <div className="mb-6 flex items-start gap-2 px-3 text-moss">
          <span className="mt-0.5 shrink-0"><AcornMark size={20} /></span>
          <span className="font-display text-lg leading-tight text-ink">{householdName}</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const on = active(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150 ${on ? "bg-raised font-medium text-ink" : "text-muted hover:bg-raised/60 hover:text-ink"}`}>
                <Icon size={18} strokeWidth={1.5} className={on ? "text-moss" : "text-faint"} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-3">
          <form action="/auth/signout" method="post">
            <button className="text-sm text-muted transition-colors duration-150 hover:text-ink">Sign out</button>
          </form>
          <ThemeToggle />
        </div>
      </aside>
      {/* Mobile bottom tab bar */}
      {FAB_PAGES.includes(path) && (
        <Link href="/projects/new" aria-label="Add project"
          className="btn fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 !rounded-2xl !p-0 shadow-[0_8px_24px_rgba(31,27,22,0.16)] md:hidden">
          <Plus size={24} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${on ? "font-medium text-moss" : "text-muted"}`}>
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
