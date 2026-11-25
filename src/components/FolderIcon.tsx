/** A little folder in the folder's own color. */
export default function FolderIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.82)} viewBox="0 0 34 28" aria-hidden="true" className="shrink-0">
      <path d="M2 6a4 4 0 0 1 4-4h7l3 4h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill={color} stroke="var(--bark)" strokeWidth="1.5" />
    </svg>
  );
}
