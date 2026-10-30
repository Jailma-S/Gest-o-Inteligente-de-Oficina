import type { WorkOrder } from "@/domain/entities";
import { hoursBetween } from "@/shared/utils/time";

/** Fração da janela chegada → prazo prometido já consumida (0 = acabou de chegar, 1 = vencido). */
export function slaConsumption(order: Pick<WorkOrder, "arrivedAt" | "promisedDate">, now: Date): number | null {
  if (!order.promisedDate) return null;
  const window = hoursBetween(order.arrivedAt, order.promisedDate);
  if (window <= 0) return 1;
  return hoursBetween(order.arrivedAt, now) / window;
}

export function hoursToDeadline(order: Pick<WorkOrder, "promisedDate">, now: Date): number | null {
  if (!order.promisedDate) return null;
  return hoursBetween(now, order.promisedDate);
}
