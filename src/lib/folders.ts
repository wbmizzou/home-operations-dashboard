export type Folder = { id: string; name: string; color: string; goal: string | null };

/** Quick picks for a folder's color; any other color can be chosen with the custom picker. */
export const FOLDER_COLORS = [
  "#ffd36e", // honey
  "#f3c7cf", // blossom
  "#c0d79b", // fern
  "#cfe3ea", // rain
  "#e0b48a", // acorn
  "#d7c4ec", // lavender
  "#f2a07b", // persimmon
  "#a9cbb7", // sage
] as const;

export const isHexColor = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
