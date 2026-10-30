import type { Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import { compatibleBoxes, rankCandidates, technicianFreeAt } from "@/domain/rules/matching";
import { sortQueue } from "@/domain/rules/queue";
import type { QueuePlanItem } from "../dto";

/**
 * Ordena a fila e simula a alocação em sequência: cada OS reserva o melhor mecânico
 * e um box livre, para que a próxima OS da fila não receba a mesma sugestão.
 */
export class ReorganizeQueueUseCase {
  execute(orders: WorkOrder[], technicians: Technician[], boxes: WorkshopBox[], now: Date): QueuePlanItem[] {
    const freeAt = technicianFreeAt(orders, now);
    const reservedBoxes = new Set<string>();

    return sortQueue(orders, now).map((order, idx) => {
      const best = rankCandidates(order, technicians, freeAt, now).find((c) => c.eligible) ?? null;
      const box = compatibleBoxes(order, boxes).find((b) => !reservedBoxes.has(b.id)) ?? null;
      if (best) freeAt.set(best.technician.id, best.projectedFinish);
      if (box) reservedBoxes.add(box.id);
      return { position: idx + 1, order, suggestion: best, box };
    });
  }
}
