import { Plus } from "lucide-react";
/** Sticky actions for the Add page: Save, or Save & add another, always in reach. */
export default function NewToolbar({ formId }: { formId: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mt-3 border-b border-line bg-bg px-4 py-2 md:-mx-10 md:px-10">
      <div className="flex items-center gap-3">
        <button type="submit" form={formId} name="intent" value="another"
          className="btn-quiet min-h-11"><Plus size={16} strokeWidth={1.75} aria-hidden />Save &amp; add another</button>
        <button type="submit" form={formId} name="intent" value="save" className="btn ml-auto inline-flex">Save project</button>
      </div>
    </div>
  );
}
