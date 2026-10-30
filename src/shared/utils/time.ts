const HOUR_MS = 3_600_000;

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / HOUR_MS;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR_MS);
}

export function formatHours(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) return "—";
  const sign = hours < 0 ? "-" : "";
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${sign}${m}min`;
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

export function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
