import type { WorkshopRepository } from "@/domain/repositories";
import { calculatePriority } from "@/domain/rules/priority";

/** Recalcula prioridades das OS abertas — o SLA se aproxima com o tempo e pode promover P3 a P2. */
export class CalculatePriorityUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async execute(now: Date = new Date()): Promise<number> {
    const orders = await this.repo.listWorkOrders();
    let changed = 0;
    for (const order of orders) {
      if (order.status === "DONE") continue;
      const { priority, reason } = calculatePriority(order, now);
      if (priority !== order.priority || reason !== order.priorityReason) {
        await this.repo.updateWorkOrder(order.id, { priority, priorityReason: reason });
        changed++;
      }
    }
    return changed;
  }
}
