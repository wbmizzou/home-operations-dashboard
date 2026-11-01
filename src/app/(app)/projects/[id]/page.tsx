import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/ProjectForm";
import CompleteProject from "@/components/CompleteProject";
import ServiceLog from "@/components/ServiceLog";
import { isRecurring } from "@/lib/recurrence";
import type { Project } from "@/lib/constants";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: cats }, { data: others }, { data: logs }] = await Promise.all([
    supabase.from("projects").select("*, categories(name)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").order("title"),
    supabase.from("service_logs").select("id, performed_on, cost, notes").eq("project_id", id).order("performed_on", { ascending: false }),
  ]);
  if (!project) notFound();
  const p = project as Project;

  return (
    <>
      <Link href="/projects" className="text-sm text-muted">← All projects</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl text-moss">{p.status === "Complete" ? "✅ " : ""}{p.title}</h1>
        {p.status !== "Complete" && (
          <CompleteProject id={p.id} title={p.title} defaultCost={p.actual_cost ?? p.quoted_cost ?? p.estimated_cost} recurring={isRecurring(p)} />
        )}
      </div>
      {isRecurring(p) && p.status !== "Complete" && <ServiceLog projectId={p.id} months={p.recurrence_months} logs={logs ?? []} />}
      <ProjectForm categories={cats ?? []} projects={others ?? []} initial={p} />
    </>
  );
}
