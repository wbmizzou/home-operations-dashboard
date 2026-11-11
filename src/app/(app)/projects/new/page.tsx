import { createClient } from "@/lib/supabase/server";
import NewToolbar from "@/components/NewToolbar";
import ProjectForm from "@/components/ProjectForm";
import { getHousehold } from "@/lib/household";

export default async function NewProject() {
  const supabase = await createClient();
  const hh = (await getHousehold())!;
  const [{ data: cats }, { data: projects }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("projects").select("id, title").is("deleted_at", null).neq("status", "Complete").order("title"),
  ]);
  return (
    <>
      <h1 className="text-3xl text-moss">Add a project</h1>
      <NewToolbar formId="project-form" />
      <ProjectForm formId="project-form" hideSubmit owners={hh.owners} defaultOwner={hh.members.length > 1 ? "Joint" : hh.me} categories={cats ?? []} projects={projects ?? []} />
    </>
  );
}
