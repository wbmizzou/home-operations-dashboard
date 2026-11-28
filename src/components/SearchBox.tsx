"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Search } from "lucide-react";

/** Live search: updates ?q= (keeping other filters) after a short pause in typing. */
export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("q") ?? "";
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL changes (back/forward, Clear filters), show its search term.
  const [shown, setShown] = useState(current);
  if (shown !== current) { setShown(current); setValue(current); }

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next.trim()); else sp.delete("q");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); clearTimeout(timer.current); push(value); }} className="relative">
      <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        type="search" value={value} aria-label="Search projects"
        placeholder="Search projects"
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => push(e.target.value), 250);
        }}
        className="input !pl-10"
      />
    </form>
  );
}
