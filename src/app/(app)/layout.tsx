import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getHousehold } from "@/lib/household";
import Toaster from "@/components/Toaster";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const hh = await getHousehold();
  if (!hh) redirect("/welcome");
  return (
    <>
      <Nav householdName={hh.household.name} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:ml-60 md:max-w-none md:px-10 md:pb-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <Toaster />
    </>
  );
}
