import type { Alert, AlertType } from "@/domain/entities";
import type { WorkshopRepository } from "@/domain/repositories";
import { evaluateConditionAlerts } from "@/domain/rules/alerts";

const CONDITION_TYPES: AlertType[] = ["SLA_RISK", "BOX_IDLE", "PARTS_MISSING"];

/** Cria alertas novos, sem duplicar, e resolve sozinho os que deixaram de valer. */
export class GenerateAlertsUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async execute(now: Date = new Date()): Promise<Alert[]> {
    const [orders, boxes, alerts] = await Promise.all([
      this.repo.listWorkOrders(),
      this.repo.listBoxes(),
      this.repo.listAlerts(),
    ]);
    const drafts = evaluateConditionAlerts(orders, boxes, now);
    const draftKeys = new Set(drafts.map((d) => d.dedupeKey));
    const open = alerts.filter((a) => !a.resolved);
    const openKeys = new Set(open.map((a) => a.dedupeKey));

    const stale = open.filter((a) => CONDITION_TYPES.includes(a.type) && !draftKeys.has(a.dedupeKey));
    await this.repo.resolveAlerts(stale.map((a) => a.id));
    await this.repo.insertAlerts(drafts.filter((d) => !openKeys.has(d.dedupeKey)));

    return (await this.repo.listAlerts()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
