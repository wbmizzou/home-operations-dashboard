"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏡", mobile: true },
  { href: "/projects", label: "Projects", icon: "🍂", mobile: true },
  { href: "/upkeep", label: "Upkeep", icon: "🔁", mobile: true },
  { href: "/projects/new", label: "Add project", icon: "🌱", mobile: false }, // phones use the floating + instead
  { href: "/settings", label: "Settings", icon: "⚙️", mobile: true },
];
// Pages where the floating "add project" button appears on phones.
const FAB_PAGES = ["/", "/projects", "/upkeep"];

export default function Nav({ householdName }: { householdName: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || (href === "/projects" && path.startsWith("/projects") && path !== "/projects/new"));
  return (
    <>
      {/* Desktop side nav */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface/70 p-5 backdrop-blur md:flex">
        <div className="font-display mb-8 text-2xl leading-tight text-moss">🌰 {householdName}</div>
        <nav className="flex flex-col gap-1">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href}
              className={`rounded-xl px-3 py-2.5 font-medium ${active(i.href) ? "bg-moss/15 text-moss" : "text-muted hover:text-ink"}`}>
              <span className="mr-2">{i.icon}</span>{i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2">
          <form action="/auth/signout" method="post">
            <button className="text-sm text-muted hover:text-ink">Sign out</button>
          </form>
          <ThemeToggle />
        </div>
      </aside>
      {/* Mobile bottom tab bar */}
      {FAB_PAGES.includes(path) && (
        <Link href="/projects/new" aria-label="Add project"
          className="btn fixed flex bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 !p-0 text-2xl shadow-lg md:hidden">＋</Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.filter((i) => i.mobile).map((i) => (
          <Link key={i.href} href={i.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active(i.href) ? "text-moss" : "text-muted"}`}>
            <span className="text-lg leading-none">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
