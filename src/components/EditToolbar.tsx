"use client";
import { useState } from "react";
import CompleteProject from "@/components/CompleteProject";
import { Check } from "lucide-react";

/** Sticky action row for the edit page: Mark complete (when allowed) and Save changes, always in reach. */
export default function EditToolbar({ id, title, defaultCost, canComplete, formId }: {
  id: string; title: string; defaultCost: number | null; canComplete: boolean; formId: string;
}) {
  const [completing, setCompleting] = useState(false);
  return (
    <div className={`${completing ? "relative" : "sticky"} top-0 z-30 -mx-4 mt-3 border-b border-line bg-bg px-4 py-2 md:-mx-10 md:px-10`}>
      <div className="flex items-center gap-3">
        {canComplete && (
          <button type="button" onClick={() => setCompleting(!completing)} className="btn-quiet min-h-11"><Check size={16} strokeWidth={1.75} aria-hidden className="text-moss" />Mark complete</button>
        )}
        <button type="submit" form={formId} className="btn ml-auto inline-flex">Save changes</button>
      </div>
      <CompleteProject id={id} title={title} defaultCost={defaultCost} open={completing} onClose={() => setCompleting(false)} />
    </div>
  );
}
