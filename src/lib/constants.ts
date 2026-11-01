export const STATUSES = [
  "Wishlist",
  "Planned",
  "Researching",
  "Getting Quotes",
  "Not Started",
  "Scheduled",
  "In Progress",
  "Waiting",
  "Recurring",
  "Complete",
] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = [
  { value: 1, label: "P1", focus: "Protect the house" },
  { value: 2, label: "P2", focus: "Prevent deterioration" },
  { value: 3, label: "P3", focus: "Restore the landscape" },
  { value: 4, label: "P4", focus: "Improve enjoyment" },
  { value: 5, label: "P5", focus: "Longer-term upgrades" },
] as const;

export const SEASONS = ["Spring", "Summer", "Fall", "Winter", "Anytime"] as const;
export const DIY_HIRE = ["DIY", "Hire", "Purchase"] as const;
export const OWNERS = ["Will", "Joint", "Natalie"] as const;

export type Project = {
  id: string;
  title: string;
  category_id: string | null;
  priority: number;
  seasons: string[];
  diy_hire: string | null;
  owner: string | null;
  status: Status;
  target_date: string | null;
  target_note: string | null;
  notes: string | null;
  estimated_cost: number | null;
  quoted_cost: number | null;
  actual_cost: number | null;
  blocked_by: string | null;
  recurrence_months: number | null;
  completed_on: string | null;
  categories: { name: string } | null;
};

export function currentSeason(d = new Date()): (typeof SEASONS)[number] {
  const m = d.getMonth(); // 0 = Jan
  if (m >= 2 && m <= 4) return "Spring";
  if (m >= 5 && m <= 7) return "Summer";
  if (m >= 8 && m <= 10) return "Fall";
  return "Winter";
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

// Stages shown in the "where everything stands" pipeline (idea -> in motion).
export const PIPELINE_STAGES = [
  "Wishlist", "Planned", "Researching", "Getting Quotes", "Not Started", "Scheduled", "In Progress", "Waiting",
] as const;
