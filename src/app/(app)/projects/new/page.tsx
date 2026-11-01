import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/ProjectForm";

export default async function NewProject() {
  const supabase = await createClient();
  const [{ data: cats }, { data: projects }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").neq("status", "Complete").order("title"),
  ]);
  return (
    <>
      <h1 className="text-3xl text-moss">Add a project</h1>
      <ProjectForm categories={cats ?? []} projects={projects ?? []} />
    </>
  );
}
