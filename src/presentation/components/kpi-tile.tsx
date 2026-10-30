export function KpiTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const color = { default: "text-ink", good: "text-done", warn: "text-p2", bad: "text-p1" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function formatPct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
