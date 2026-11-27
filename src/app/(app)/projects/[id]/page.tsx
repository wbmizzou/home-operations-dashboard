import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/ProjectForm";
import { requireHousehold } from "@/lib/household";
import EditToolbar from "@/components/EditToolbar";
import FolderIcon from "@/components/FolderIcon";
import ProjectPhotos, { type Photo } from "@/components/ProjectPhotos";
import { PHOTO_BUCKET, thumbPath } from "@/lib/photos";
import ServiceLog from "@/components/ServiceLog";
import { isRecurring } from "@/lib/recurrence";
import type { Project } from "@/lib/constants";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const hh = await requireHousehold();
  const [{ data: project }, { data: cats }, { data: others }, { data: logs }, { data: folders }, { data: photoRows }] = await Promise.all([
    supabase.from("projects").select("*, categories(name)").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").is("deleted_at", null).order("title"),
    supabase.from("service_logs").select("id, performed_on, cost, notes").eq("project_id", id).order("performed_on", { ascending: false }),
    supabase.from("folders").select("id, name, color, goal").order("name"),
    supabase.from("project_photos").select("id, path, caption, created_at, created_by").eq("project_id", id).order("created_at"),
  ]);
  if (!project) notFound();
  const p = project as Project;
  const inFolder = (folders ?? []).find((f) => f.id === p.folder_id);

  // Photos: short-lived signed links (an hour) for each photo and its thumbnail.
  const rows = photoRows ?? [];
  const paths = rows.flatMap((r) => [r.path, thumbPath(r.path)]);
  const { data: signed } = paths.length ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const link = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const nameOf = new Map(hh.members.map((m) => [m.user_id, m.display_name]));
  const photos: Photo[] = rows.map((r) => ({ id: r.id, path: r.path, caption: r.caption, created_at: r.created_at,
    by: r.created_by ? nameOf.get(r.created_by) ?? null : null, url: link.get(r.path) ?? null, thumb: link.get(thumbPath(r.path)) ?? null }));

  // Warn when this project is waiting on another one that isn't finished yet.
  const { data: blocker } = p.blocked_by && p.status !== "Complete"
    ? await supabase.from("projects").select("id, title, status").eq("id", p.blocked_by).is("deleted_at", null).neq("status", "Complete").maybeSingle()
    : { data: null };

  return (
    <>
      <div className="flex flex-wrap gap-x-3 text-sm text-muted">
        <Link href="/projects">← All projects</Link>
        {inFolder && <Link href={`/projects/folders/${inFolder.id}`} className="inline-flex items-center gap-1.5"><FolderIcon color={inFolder.color} size={16} />{inFolder.name}</Link>}
      </div>
      <h1 className="mt-1 text-3xl text-moss">{p.status === "Complete" ? "✅ " : ""}{p.title}</h1>
      <EditToolbar id={p.id} title={p.title} defaultCost={p.actual_cost ?? p.quoted_cost ?? p.estimated_cost}
        canComplete={p.status !== "Complete" && !isRecurring(p)} formId="project-form" />
      {blocker && (
        <p className="mt-3 rounded-2xl border-2 p-3 text-sm" style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 14%, var(--surface))" }}>
          ⛔ This is waiting on <Link href={`/projects/${blocker.id}`} className="font-semibold underline">{blocker.title}</Link>, which is still <b>{blocker.status}</b>.
        </p>
      )}
      <ProjectPhotos projectId={p.id} householdId={hh.household.id} photos={photos} />
      {isRecurring(p) && p.status !== "Complete" && <ServiceLog projectId={p.id} months={p.recurrence_months} logs={logs ?? []} target={p.target_date} rule={p.recurrence} />}
      <ProjectForm formId="project-form" hideSubmit statuses={hh.statusNames} owners={hh.owners} priorities={hh.priorities} seedDate={logs?.[0]?.performed_on ?? (p as Project & { created_at?: string }).created_at?.slice(0, 10) ?? null} categories={cats ?? []} folders={folders ?? []} projects={others ?? []} initial={p} />
    </>
  );
}
