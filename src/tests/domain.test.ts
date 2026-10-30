import { describe, expect, it } from "vitest";
import type { Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import { evaluateConditionAlerts } from "@/domain/rules/alerts";
import { compatibleBoxes, eligibilityBlock, rankCandidates } from "@/domain/rules/matching";
import { calculatePriority } from "@/domain/rules/priority";
import { sortQueue } from "@/domain/rules/queue";
import { addHours } from "@/shared/utils/time";

const now = new Date("2026-10-30T10:00:00-03:00");

function order(patch: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "o1",
    osNumber: "OS-1",
    plate: "ABC1D23",
    chassis: null,
    customerName: null,
    serviceType: "REVISAO",
    requiredSkillId: null,
    estimatedHours: 2,
    planGold: false,
    sensitiveCargo: false,
    partsMissing: false,
    arrivedAt: addHours(now, -1),
    promisedDate: addHours(now, 48),
    priority: "P3",
    priorityReason: "",
    status: "WAITING",
    assignedTechnicianId: null,
    assignedBoxId: null,
    startedAt: null,
    finishedAt: null,
    rework: false,
    updatedAt: now,
    ...patch,
  };
}

function tech(patch: Partial<Technician> = {}): Technician {
  return { id: "t", name: "T", level: "PLENO", productivityScore: 80, available: true, active: true, skills: [], ...patch };
}

describe("priorização", () => {
  it("Regra 01: Plano Ouro é sempre P1", () => {
    expect(calculatePriority(order({ planGold: true }), now).priority).toBe("P1");
  });
  it("Regra 02: Carga sensível é sempre P1", () => {
    expect(calculatePriority(order({ sensitiveCargo: true, serviceType: "PREVENTIVA" }), now).priority).toBe("P1");
  });
  it("Corretiva é P2 e revisão com prazo folgado é P3", () => {
    expect(calculatePriority(order({ serviceType: "CORRETIVA" }), now).priority).toBe("P2");
    expect(calculatePriority(order(), now).priority).toBe("P3");
  });
  it("Revisão com SLA próximo do vencimento sobe para P2", () => {
    const result = calculatePriority(order({ promisedDate: addHours(now, 6) }), now);
    expect(result).toEqual({ priority: "P2", reason: "SLA próximo do vencimento" });
  });
});

describe("regras de elegibilidade", () => {
  const complex = order({ serviceType: "DIAGNOSTICO_COMPLEXO" });
  it("Regra 03: Assistente não assume Diagnóstico Complexo", () => {
    expect(eligibilityBlock(complex, tech({ level: "ASSISTENTE" }))).toMatch(/Regra 03/);
  });
  it("Regra 04: JR só executa serviços compatíveis", () => {
    expect(eligibilityBlock(complex, tech({ level: "JR" }))).toMatch(/Regra 04/);
    expect(eligibilityBlock(order({ serviceType: "CORRETIVA" }), tech({ level: "JR" }))).toBeNull();
  });
  it("mecânico ausente não é elegível", () => {
    expect(eligibilityBlock(order(), tech({ available: false }))).not.toBeNull();
  });
});

describe("matching", () => {
  const diag = order({ serviceType: "DIAGNOSTICO", requiredSkillId: "diag", planGold: true, promisedDate: addHours(now, 6), estimatedHours: 3 });
  const sr = tech({ id: "a", name: "A", level: "SR", productivityScore: 95, skills: [{ skillId: "diag", proficiency: 5, certified: true }] });
  const pleno = tech({ id: "b", name: "B", level: "PLENO", productivityScore: 70, skills: [{ skillId: "diag", proficiency: 3, certified: false }] });
  const jr = tech({ id: "c", name: "C", level: "JR", productivityScore: 90, skills: [{ skillId: "diag", proficiency: 3, certified: false }] });

  it("exemplo da especificação: SR disponível vence Pleno disponível", () => {
    const [first, second] = rankCandidates(diag, [pleno, sr], new Map(), now);
    expect(first.technician.id).toBe("a");
    expect(first.score).toBeGreaterThan(second.score);
  });

  it("Regra 05: em diagnóstico, Pleno é preferido a JR com mesma proficiência", () => {
    const ranked = rankCandidates(diag, [jr, pleno], new Map(), now);
    expect(ranked[0].technician.id).toBe("b");
  });

  it("SLA pesa 50%: mecânico ocupado que estoura o prazo perde para um livre", () => {
    const busy = new Map([["a", addHours(now, 6)]]);
    const ranked = rankCandidates(diag, [sr, pleno], busy, now);
    expect(ranked[0].technician.id).toBe("b");
  });

  it("score fica entre 0 e 100", () => {
    for (const c of rankCandidates(diag, [sr, pleno, jr], new Map(), now)) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("boxes", () => {
  const box = (code: string, category: WorkshopBox["category"], status: WorkshopBox["status"] = "AVAILABLE"): WorkshopBox => ({
    id: code, code, category, status, currentWorkOrderId: null, updatedAt: now,
  });
  it("Regra 06: boxes ocupados ou em manutenção não entram no cálculo", () => {
    const result = compatibleBoxes(order({ serviceType: "CORRETIVA" }), [
      box("B1", "GERAL", "OCCUPIED"), box("B2", "GERAL", "MAINTENANCE"), box("B3", "GERAL"),
    ]);
    expect(result.map((b) => b.code)).toEqual(["B3"]);
  });
  it("diagnóstico prefere box de diagnóstico", () => {
    const result = compatibleBoxes(order({ serviceType: "DIAGNOSTICO" }), [box("B1", "GERAL"), box("B2", "DIAGNOSTICO"), box("B3", "RAPIDO")]);
    expect(result.map((b) => b.code)).toEqual(["B2", "B1"]);
  });
});

describe("fila e alertas", () => {
  it("fila ordena por prioridade e depois por SLA consumido", () => {
    const q = sortQueue([
      order({ id: "p3", priority: "P3" }),
      order({ id: "p1", priority: "P1" }),
      order({ id: "p2-folgado", priority: "P2", promisedDate: addHours(now, 40) }),
      order({ id: "p2-apertado", priority: "P2", promisedDate: addHours(now, 2) }),
    ], now);
    expect(q.map((o) => o.id)).toEqual(["p1", "p2-apertado", "p2-folgado", "p3"]);
  });

  it("gera alerta de SLA a partir de 80% consumido", () => {
    const risky = order({ arrivedAt: addHours(now, -9), promisedDate: addHours(now, 1) });
    const safe = order({ id: "o2", arrivedAt: addHours(now, -1), promisedDate: addHours(now, 9) });
    const alerts = evaluateConditionAlerts([risky, safe], [], now);
    expect(alerts.filter((a) => a.type === "SLA_RISK").map((a) => a.workOrderId)).toEqual(["o1"]);
  });

  it("gera alerta de box parado e de peça indisponível", () => {
    const o = order({ status: "IN_PROGRESS", partsMissing: true, updatedAt: addHours(now, -1) });
    const b: WorkshopBox = { id: "b", code: "B1", category: "GERAL", status: "OCCUPIED", currentWorkOrderId: "o1", updatedAt: addHours(now, -1) };
    const types = evaluateConditionAlerts([o], [b], now).map((a) => a.type).sort();
    expect(types).toEqual(["BOX_IDLE", "PARTS_MISSING"]);
  });
});
