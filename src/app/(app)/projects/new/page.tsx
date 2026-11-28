import { createClient } from "@/lib/supabase/server";
import NewToolbar from "@/components/NewToolbar";
import ProjectForm from "@/components/ProjectForm";
import { requireHousehold } from "@/lib/household";

export default async function NewProject({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const { folder } = await searchParams;
  const supabase = await createClient();
  const hh = await requireHousehold();
  const [{ data: cats }, { data: projects }, { data: folders }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").is("deleted_at", null).neq("status", "Complete").order("title"),
    supabase.from("folders").select("id, name, color, goal").order("name"),
  ]);
  const defaultFolderId = folders?.some((f) => f.id === folder) ? folder! : null;
  return (
    <>
      <h1 className="text-3xl">Add a project</h1>
      <NewToolbar formId="project-form" />
      <ProjectForm formId="project-form" hideSubmit statuses={hh.statusNames} owners={hh.owners} priorities={hh.priorities} defaultOwner={hh.members.length > 1 ? "Joint" : hh.me} categories={cats ?? []} folders={folders ?? []} defaultFolderId={defaultFolderId} projects={projects ?? []} />
    </>
  );
}
