/** Sticky actions for the Add page: Save, or Save & add another, always in reach. */
export default function NewToolbar({ formId }: { formId: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mt-3 px-4 py-2 backdrop-blur md:-mx-10 md:px-10"
      style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
      <div className="flex items-center gap-3">
        <button type="submit" form={formId} name="intent" value="another"
          className="rounded-full border-2 border-moss px-4 py-2.5 text-sm font-semibold text-moss">＋ Save &amp; add another</button>
        <button type="submit" form={formId} name="intent" value="save" className="btn ml-auto inline-flex">Save project</button>
      </div>
    </div>
  );
}
