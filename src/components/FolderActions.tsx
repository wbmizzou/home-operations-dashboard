"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FolderEditor from "@/components/FolderEditor";
import type { Folder } from "@/lib/folders";

/** "Edit folder" button on a folder's page (rename, recolor, set the goal, or delete). */
export default function FolderActions({ folder }: { folder: Folder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="btn-quiet shrink-0">Edit</button>
      {open && <FolderEditor folder={folder} onClose={() => setOpen(false)} onDeleted={() => router.push("/projects")} />}
    </>
  );
}
