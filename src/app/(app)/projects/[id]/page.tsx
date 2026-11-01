import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/ProjectForm";
import CompleteProject from "@/components/CompleteProject";
import type { Project } from "@/lib/constants";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: cats }, { data: others }] = await Promise.all([
    supabase.from("projects").select("*, categories(name)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").order("title"),
  ]);
  if (!project) notFound();
  const p = project as Project;

  return (
    <>
      <Link href="/projects" className="text-sm text-muted">← All projects</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl text-moss">{p.status === "Complete" ? "✅ " : ""}{p.title}</h1>
        {p.status !== "Complete" && (
          <CompleteProject id={p.id} title={p.title} defaultCost={p.actual_cost ?? p.quoted_cost ?? p.estimated_cost} recurring={p.status === "Recurring" || !!p.recurrence_months} />
        )}
      </div>
      {(p.status === "Recurring" || p.recurrence_months) && p.status !== "Complete" && (
        <p className="mt-2 text-sm text-muted">Recurring work stays open. Logging each service (with date and cost) is coming soon.</p>
      )}
      <ProjectForm categories={cats ?? []} projects={others ?? []} initial={p} />
    </>
  );
}
