export function addMonths(date: string, months: number): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const isRecurring = (p: { status: string; recurrence_months: number | null }) =>
  p.status === "Recurring" || !!p.recurrence_months;

export type DueState = "overdue" | "soon" | "never" | "later";
/** Next due date (last service + interval) and how urgent it is. "Soon" = within 30 days. */
export function dueInfo(last: string | null, months: number | null, today = new Date().toISOString().slice(0, 10)) {
  const due = last && months ? addMonths(last, months) : null;
  const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const state: DueState = !due ? "never" : due < today ? "overdue" : due <= soon ? "soon" : "later";
  return { due, state };
}
export const prettyDate = (d: string, today = new Date().toISOString().slice(0, 10)) =>
  new Date(d + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric" });
