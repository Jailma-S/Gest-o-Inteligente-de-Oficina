import type { WorkOrder } from "@/domain/entities";
import { slaConsumption } from "@/domain/value-objects/sla";
import { PRIORITY_RANK } from "./priority";

/** Fila de espera: prioridade → SLA mais consumido → chegada mais antiga. */
export function sortQueue(orders: WorkOrder[], now: Date): WorkOrder[] {
  return orders
    .filter((o) => o.status === "WAITING")
    .sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (byPriority !== 0) return byPriority;
      const slaA = slaConsumption(a, now) ?? -1;
      const slaB = slaConsumption(b, now) ?? -1;
      if (slaA !== slaB) return slaB - slaA;
      return a.arrivedAt.getTime() - b.arrivedAt.getTime();
    });
}
