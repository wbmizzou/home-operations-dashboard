import { redirect } from "next/navigation";
import { getHousehold } from "@/lib/household";
import WelcomeForm from "@/components/WelcomeForm";

export const dynamic = "force-dynamic";

export default async function Welcome({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await getHousehold()) redirect("/"); // already set up (or just joined via an email invite)
  const { code } = await searchParams;
  return <WelcomeForm initialCode={code ?? ""} />;
}
