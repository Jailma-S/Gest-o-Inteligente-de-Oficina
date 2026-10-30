import type { WorkOrderStatus } from "@/domain/entities";
import type { WorkshopRepository } from "@/domain/repositories";

export type ExecutionAction = "start" | "pause" | "resume" | "finish" | "rework" | "toggleParts";

const ALLOWED_FROM: Record<Exclude<ExecutionAction, "toggleParts">, WorkOrderStatus[]> = {
  start: ["ASSIGNED"],
  pause: ["IN_PROGRESS"],
  resume: ["PAUSED"],
  finish: ["IN_PROGRESS", "PAUSED"],
  rework: ["DONE"],
};

/** Ciclo de execução da OS pelo mecânico / supervisor. */
export class ExecuteWorkOrderUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async execute(orderId: string, action: ExecutionAction, now: Date = new Date()): Promise<void> {
    const order = await this.repo.getWorkOrder(orderId);
    if (!order) throw new Error("OS não encontrada.");

    if (action === "toggleParts") {
      await this.repo.updateWorkOrder(orderId, { partsMissing: !order.partsMissing });
      return;
    }
    if (!ALLOWED_FROM[action].includes(order.status)) {
      throw new Error(`Ação inválida para OS com status ${order.status}.`);
    }

    switch (action) {
      case "start":
        await this.repo.updateWorkOrder(orderId, { status: "IN_PROGRESS", startedAt: now });
        break;
      case "pause":
        await this.repo.updateWorkOrder(orderId, { status: "PAUSED" });
        break;
      case "resume":
        await this.repo.updateWorkOrder(orderId, { status: "IN_PROGRESS" });
        break;
      case "finish":
        await this.repo.updateWorkOrder(orderId, { status: "DONE", finishedAt: now });
        await this.releaseBox(orderId);
        break;
      case "rework":
        await this.repo.updateWorkOrder(orderId, { rework: true });
        break;
    }
  }

  private async releaseBox(orderId: string) {
    const box = (await this.repo.listBoxes()).find((b) => b.currentWorkOrderId === orderId);
    if (box) await this.repo.saveBox({ ...box, status: "AVAILABLE", currentWorkOrderId: null });
  }
}
