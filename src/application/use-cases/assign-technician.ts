import type { WorkshopRepository } from "@/domain/repositories";
import { compatibleBoxes, eligibilityBlock, rankCandidates, technicianFreeAt } from "@/domain/rules/matching";
import { explainRecommendation } from "@/infrastructure/ai/allocation-advisor";
import type { AllocationSuggestion } from "../dto";

export class AssignTechnicianUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async suggest(orderId: string, now: Date = new Date()): Promise<AllocationSuggestion | null> {
    const [orders, technicians, boxes] = await Promise.all([
      this.repo.listWorkOrders(),
      this.repo.listTechnicians(),
      this.repo.listBoxes(),
    ]);
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const candidates = rankCandidates(order, technicians, technicianFreeAt(orders, now), now);
    const options = compatibleBoxes(order, boxes);
    const recommendedBox = options[0] ?? null;
    return {
      order,
      candidates,
      boxes: options,
      recommendedBox,
      justification: explainRecommendation(order, candidates[0], candidates[1], recommendedBox ?? undefined),
    };
  }

  /** Aprovação do supervisor/PCP. */
  async approve(orderId: string, technicianId: string, boxId: string): Promise<void> {
    const [order, technicians, boxes] = await Promise.all([
      this.repo.getWorkOrder(orderId),
      this.repo.listTechnicians(),
      this.repo.listBoxes(),
    ]);
    if (!order) throw new Error("OS não encontrada.");
    if (order.status !== "WAITING") throw new Error("Só OS aguardando podem ser alocadas.");

    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech) throw new Error("Mecânico não encontrado.");
    const block = eligibilityBlock(order, tech);
    if (block) throw new Error(`Alocação bloqueada: ${block}.`);

    const box = compatibleBoxes(order, boxes).find((b) => b.id === boxId);
    if (!box) throw new Error("Box indisponível ou incompatível com o serviço (Regra 06).");

    await this.repo.updateWorkOrder(orderId, {
      status: "ASSIGNED",
      assignedTechnicianId: technicianId,
      assignedBoxId: boxId,
    });
    await this.repo.saveBox({ ...box, status: "OCCUPIED", currentWorkOrderId: orderId });
  }
}
