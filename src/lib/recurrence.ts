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
