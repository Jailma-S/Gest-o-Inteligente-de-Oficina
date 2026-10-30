import type { Technician, TechnicianLevel, WorkOrder, WorkshopBox } from "@/domain/entities";
import { MATCHING_WEIGHTS } from "@/shared/constants";
import { addHours, hoursBetween } from "@/shared/utils/time";
import {
  SERVICE_BOX_CATEGORIES,
  SERVICE_COMPLEXITY,
  isDiagnostic,
  levelCanExecute,
} from "./service-catalog";

export interface ScoreBreakdown {
  sla: number;
  availability: number;
  skill: number;
  certification: number;
  productivity: number;
}

export interface Candidate {
  technician: Technician;
  eligible: boolean;
  blockedBy: string | null;
  /** 0 a 100. */
  score: number;
  breakdown: ScoreBreakdown;
  freeAt: Date;
  projectedFinish: Date;
}

const LEVEL_FIT: Record<"BAIXA" | "MEDIA" | "ALTA", Record<TechnicianLevel, number>> = {
  // Evita gastar SR em serviço simples.
  BAIXA: { ASSISTENTE: 100, JR: 100, PLENO: 80, SR: 60 },
  MEDIA: { ASSISTENTE: 0, JR: 75, PLENO: 100, SR: 90 },
  ALTA: { ASSISTENTE: 0, JR: 0, PLENO: 85, SR: 100 },
};

export function eligibilityBlock(order: WorkOrder, tech: Technician): string | null {
  if (!tech.active) return "Inativo";
  if (!tech.available) return "Fora do turno / indisponível";
  if (!levelCanExecute(tech.level, order.serviceType)) {
    return tech.level === "ASSISTENTE"
      ? "Regra 03: Assistente não executa este serviço"
      : "Regra 04: serviço incompatível com o nível JR";
  }
  return null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function scoreCandidate(order: WorkOrder, tech: Technician, freeAt: Date, now: Date): Candidate {
  const start = freeAt > now ? freeAt : now;
  const projectedFinish = addHours(start, order.estimatedHours);

  // SLA: folga entre o término projetado e o prazo prometido (+4h = 100, -4h = 0).
  const sla = order.promisedDate
    ? clamp(50 + hoursBetween(projectedFinish, order.promisedDate) * 12.5)
    : 100;

  // Disponibilidade: 100 se livre agora, zero se só libera em 8h ou mais.
  const availability = clamp(100 - Math.max(0, hoursBetween(now, start)) * 12.5);

  // Skill match: proficiência na skill exigida + aderência do nível (Regra 05).
  const ownSkill = tech.skills.find((s) => s.skillId === order.requiredSkillId);
  const proficiency = order.requiredSkillId ? (ownSkill?.proficiency ?? 0) * 20 : 60;
  let levelFit = LEVEL_FIT[SERVICE_COMPLEXITY[order.serviceType]][tech.level];
  if (isDiagnostic(order.serviceType) && tech.level === "JR") levelFit = Math.min(levelFit, 50);
  const skill = clamp(0.7 * proficiency + 0.3 * levelFit);

  const certification = order.requiredSkillId ? (ownSkill?.certified ? 100 : 0) : 50;
  const productivity = clamp(tech.productivityScore);

  const breakdown: ScoreBreakdown = { sla, availability, skill, certification, productivity };
  const score =
    sla * MATCHING_WEIGHTS.sla +
    availability * MATCHING_WEIGHTS.availability +
    skill * MATCHING_WEIGHTS.skill +
    certification * MATCHING_WEIGHTS.certification +
    productivity * MATCHING_WEIGHTS.productivity;

  const blockedBy = eligibilityBlock(order, tech);
  return {
    technician: tech,
    eligible: blockedBy === null,
    blockedBy,
    score: Math.round(score * 10) / 10,
    breakdown,
    freeAt: start,
    projectedFinish,
  };
}

/** Quando cada mecânico fica livre, somando as OS alocadas/em execução que ainda não terminaram. */
export function technicianFreeAt(orders: WorkOrder[], now: Date): Map<string, Date> {
  const freeAt = new Map<string, Date>();
  for (const o of orders) {
    if (!o.assignedTechnicianId || o.status === "DONE" || o.status === "WAITING") continue;
    const elapsed = o.startedAt ? Math.max(0, hoursBetween(o.startedAt, now)) : 0;
    const remaining = Math.max(0.25, o.estimatedHours - elapsed);
    const current = freeAt.get(o.assignedTechnicianId) ?? now;
    freeAt.set(o.assignedTechnicianId, addHours(current, remaining));
  }
  return freeAt;
}

/** Ranking de candidatos: elegíveis primeiro, depois pelo score. */
export function rankCandidates(
  order: WorkOrder,
  technicians: Technician[],
  freeAt: Map<string, Date>,
  now: Date,
): Candidate[] {
  return technicians
    .filter((t) => t.active)
    .map((t) => scoreCandidate(order, t, freeAt.get(t.id) ?? now, now))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

/** Regra 06: boxes ocupados ou em manutenção não entram no cálculo. */
export function compatibleBoxes(order: WorkOrder, boxes: WorkshopBox[]): WorkshopBox[] {
  const accepted = SERVICE_BOX_CATEGORIES[order.serviceType];
  return boxes
    .filter((b) => b.status === "AVAILABLE" && accepted.includes(b.category))
    .sort(
      (a, b) =>
        accepted.indexOf(a.category) - accepted.indexOf(b.category) || a.code.localeCompare(b.code),
    );
}
