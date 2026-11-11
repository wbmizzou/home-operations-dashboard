"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏡" },
  { href: "/projects", label: "Projects", icon: "🍂" },
  { href: "/projects/new", label: "Add", icon: "🌱" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || (href === "/projects" && path.startsWith("/projects") && path !== "/projects/new"));
  return (
    <>
      {/* Desktop side nav */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface/70 p-5 backdrop-blur md:flex">
        <div className="font-display mb-8 text-2xl text-moss">🌰 Home<br />Hollow</div>
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
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active(i.href) ? "text-moss" : "text-muted"}`}>
            <span className="text-lg leading-none">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
