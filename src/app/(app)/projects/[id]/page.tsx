import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/ProjectForm";
import EditToolbar from "@/components/EditToolbar";
import ServiceLog from "@/components/ServiceLog";
import { isRecurring } from "@/lib/recurrence";
import type { Project } from "@/lib/constants";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: cats }, { data: others }, { data: logs }] = await Promise.all([
    supabase.from("projects").select("*, categories(name)").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").is("deleted_at", null).order("title"),
    supabase.from("service_logs").select("id, performed_on, cost, notes").eq("project_id", id).order("performed_on", { ascending: false }),
  ]);
  if (!project) notFound();
  const p = project as Project;

  // Warn when this project is waiting on another one that isn't finished yet.
  const { data: blocker } = p.blocked_by && p.status !== "Complete"
    ? await supabase.from("projects").select("id, title, status").eq("id", p.blocked_by).is("deleted_at", null).neq("status", "Complete").maybeSingle()
    : { data: null };

  return (
    <>
      <Link href="/projects" className="text-sm text-muted">← All projects</Link>
      <h1 className="mt-1 text-3xl text-moss">{p.status === "Complete" ? "✅ " : ""}{p.title}</h1>
      <EditToolbar id={p.id} title={p.title} defaultCost={p.actual_cost ?? p.quoted_cost ?? p.estimated_cost}
        canComplete={p.status !== "Complete" && !isRecurring(p)} formId="project-form" />
      {blocker && (
        <p className="mt-3 rounded-2xl border-2 p-3 text-sm" style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 14%, var(--surface))" }}>
          ⛔ This is waiting on <Link href={`/projects/${blocker.id}`} className="font-semibold underline">{blocker.title}</Link>, which is still <b>{blocker.status}</b>.
        </p>
      )}
      {isRecurring(p) && p.status !== "Complete" && <ServiceLog projectId={p.id} months={p.recurrence_months} logs={logs ?? []} />}
      <ProjectForm formId="project-form" hideSubmit categories={cats ?? []} projects={others ?? []} initial={p} />
    </>
  );
}
