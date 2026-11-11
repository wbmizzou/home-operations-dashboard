import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:ml-60 md:max-w-none md:px-10 md:pb-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <Toaster />
    </>
  );
}
