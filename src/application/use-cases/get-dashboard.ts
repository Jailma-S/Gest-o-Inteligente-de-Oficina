import type { WorkshopRepository } from "@/domain/repositories";
import { computeKpis } from "@/domain/rules/kpis";
import { technicianFreeAt } from "@/domain/rules/matching";
import { summarizeBottlenecks } from "@/infrastructure/ai/allocation-advisor";
import type { DashboardData } from "../dto";
import { CalculatePriorityUseCase } from "./calculate-priority";
import { GenerateAlertsUseCase } from "./generate-alerts";
import { ReorganizeQueueUseCase } from "./reorganize-queue";

/** Visão consolidada da torre de controle: recalcula prioridades e alertas a cada leitura. */
export class GetDashboardUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async execute(now: Date = new Date()): Promise<DashboardData> {
    await new CalculatePriorityUseCase(this.repo).execute(now);
    const alerts = await new GenerateAlertsUseCase(this.repo).execute(now);

    const [orders, technicians, boxes, skills] = await Promise.all([
      this.repo.listWorkOrders(),
      this.repo.listTechnicians(),
      this.repo.listBoxes(),
      this.repo.listSkills(),
    ]);
    const queue = new ReorganizeQueueUseCase().execute(orders, technicians, boxes, now);
    const bottlenecks = summarizeBottlenecks(
      queue.map((q) => q.order),
      boxes,
      technicians,
      technicianFreeAt(orders, now),
      now,
    );

    return {
      kpis: computeKpis(orders, boxes, technicians, now),
      queue,
      boxes: boxes.sort((a, b) => a.code.localeCompare(b.code)),
      orders,
      technicians,
      skills,
      alerts,
      bottlenecks,
    };
  }
}
