import type { PriorityLevel, WorkOrder } from "@/domain/entities";
import { hoursToDeadline } from "@/domain/value-objects/sla";
import { OPERATION_CONFIG } from "@/shared/constants";

export type PriorityInput = Pick<
  WorkOrder,
  "planGold" | "sensitiveCargo" | "serviceType" | "promisedDate" | "estimatedHours"
>;

export interface PriorityResult {
  priority: PriorityLevel;
  reason: string;
}

export const PRIORITY_RANK: Record<PriorityLevel, number> = { P1: 1, P2: 2, P3: 3 };

export function calculatePriority(
  order: PriorityInput,
  now: Date,
  slaNearSlackHours: number = OPERATION_CONFIG.slaNearSlackHours,
): PriorityResult {
  // Regra 01
  if (order.planGold) return { priority: "P1", reason: "Plano Ouro" };
  // Regra 02
  if (order.sensitiveCargo) return { priority: "P1", reason: "Carga sensível" };

  const remaining = hoursToDeadline(order, now);
  if (remaining !== null && remaining <= order.estimatedHours + slaNearSlackHours) {
    return { priority: "P2", reason: "SLA próximo do vencimento" };
  }
  if (order.serviceType === "CORRETIVA") return { priority: "P2", reason: "Corretiva" };
  if (order.serviceType === "DIAGNOSTICO" || order.serviceType === "DIAGNOSTICO_COMPLEXO") {
    return { priority: "P2", reason: "Diagnóstico (parada não programada)" };
  }
  return { priority: "P3", reason: "Programada (revisão/preventiva)" };
}
