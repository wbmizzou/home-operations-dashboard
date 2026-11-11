import { createClient } from "@/lib/supabase/server";
import NewToolbar from "@/components/NewToolbar";
import ProjectForm from "@/components/ProjectForm";

export default async function NewProject() {
  const supabase = await createClient();
  const [{ data: cats }, { data: projects }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").is("deleted_at", null).neq("status", "Complete").order("title"),
  ]);
  return (
    <>
      <h1 className="text-3xl text-moss">Add a project</h1>
      <NewToolbar formId="project-form" />
      <ProjectForm formId="project-form" hideSubmit categories={cats ?? []} projects={projects ?? []} />
    </>
  );
}
