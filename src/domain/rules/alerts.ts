import type { NewAlert, WorkOrder, WorkshopBox } from "@/domain/entities";
import { slaConsumption } from "@/domain/value-objects/sla";
import { OPERATION_CONFIG } from "@/shared/constants";
import { hoursBetween } from "@/shared/utils/time";

export interface AlertConfig {
  slaRiskThreshold: number;
  boxIdleMinutes: number;
}

/** Alertas de condição contínua. Somem (são resolvidos) quando a condição deixa de existir. */
export function evaluateConditionAlerts(
  orders: WorkOrder[],
  boxes: WorkshopBox[],
  now: Date,
  config: AlertConfig = OPERATION_CONFIG,
): NewAlert[] {
  const alerts: NewAlert[] = [];
  const byId = new Map(orders.map((o) => [o.id, o]));

  for (const o of orders) {
    if (o.status === "DONE") continue;

    const consumed = slaConsumption(o, now);
    if (consumed !== null && consumed >= config.slaRiskThreshold) {
      const pct = Math.round(consumed * 100);
      alerts.push({
        type: "SLA_RISK",
        severity: consumed >= 1 ? "CRITICAL" : "HIGH",
        message: `OS ${o.osNumber}${o.plate ? ` (${o.plate})` : ""}: ${pct}% do SLA consumido${consumed >= 1 ? " — prazo vencido" : ""}.`,
        dedupeKey: `SLA_RISK:${o.id}:${consumed >= 1 ? "late" : "risk"}`,
        workOrderId: o.id,
        boxId: o.assignedBoxId,
      });
    }

    if (o.partsMissing) {
      alerts.push({
        type: "PARTS_MISSING",
        severity: "CRITICAL",
        message: `OS ${o.osNumber}: peça indisponível.`,
        dedupeKey: `PARTS_MISSING:${o.id}`,
        workOrderId: o.id,
        boxId: o.assignedBoxId,
      });
    }
  }

  for (const b of boxes) {
    if (b.status !== "OCCUPIED") continue;
    const order = b.currentWorkOrderId ? byId.get(b.currentWorkOrderId) : undefined;
    const lastUpdate = order && order.updatedAt > b.updatedAt ? order.updatedAt : b.updatedAt;
    const idleMinutes = hoursBetween(lastUpdate, now) * 60;
    if (idleMinutes >= config.boxIdleMinutes) {
      alerts.push({
        type: "BOX_IDLE",
        severity: "MEDIUM",
        message: `Box ${b.code} sem atualização há ${Math.round(idleMinutes)} min.`,
        dedupeKey: `BOX_IDLE:${b.id}`,
        workOrderId: order?.id ?? null,
        boxId: b.id,
      });
    }
  }

  return alerts;
}

export function goldArrivedAlert(order: WorkOrder): NewAlert {
  return {
    type: "GOLD_ARRIVED",
    severity: "HIGH",
    message: `Plano Ouro chegou: OS ${order.osNumber}${order.plate ? ` (${order.plate})` : ""}.`,
    dedupeKey: `GOLD_ARRIVED:${order.id}`,
    workOrderId: order.id,
    boxId: null,
  };
}
