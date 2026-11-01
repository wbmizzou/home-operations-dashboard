import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:ml-60 md:max-w-none md:px-10 md:pb-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </>
  );
}
