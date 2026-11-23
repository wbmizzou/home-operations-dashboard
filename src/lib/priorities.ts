// A household's priority levels (works in the browser and on the server).
export type PriorityLevel = { value: number; label: string; focus: string | null };

/** "P1 · Protect the house", or just "P1" when there's no description. */
export const priorityName = (p: PriorityLevel) => (p.focus ? `${p.label} · ${p.focus}` : p.label);

/** Short label for a level number, even if the level was since removed. */
export const priorityLabel = (levels: PriorityLevel[], n: number) => levels.find((l) => l.value === n)?.label ?? `P${n}`;

/** Text colour by level: first is urgent (berry), second is gold, the rest moss. */
export const priorityTone = (n: number) => (n === 1 ? "text-berry" : n === 2 ? "text-gold" : "text-moss");
