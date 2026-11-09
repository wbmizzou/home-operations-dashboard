"use client";
import { useState } from "react";
import CompleteProject from "@/components/CompleteProject";

/** Sticky action row for the edit page: Mark complete (when allowed) and Save changes, always in reach. */
export default function EditToolbar({ id, title, defaultCost, canComplete, formId }: {
  id: string; title: string; defaultCost: number | null; canComplete: boolean; formId: string;
}) {
  const [completing, setCompleting] = useState(false);
  return (
    <div className={`${completing ? "relative" : "sticky"} top-0 z-30 -mx-4 mt-3 px-4 py-2 backdrop-blur md:-mx-10 md:px-10`}
      style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
      <div className="flex items-center gap-3">
        {canComplete && (
          <button type="button" onClick={() => setCompleting(!completing)} className="btn inline-flex">🌰 Mark complete</button>
        )}
        <button type="submit" form={formId} className="btn ml-auto inline-flex">Save changes</button>
      </div>
      <CompleteProject id={id} title={title} defaultCost={defaultCost} open={completing} onClose={() => setCompleting(false)} />
    </div>
  );
}
