import type { BoxCategory, Complexity, ServiceType, TechnicianLevel } from "@/domain/entities";

export const SERVICE_COMPLEXITY: Record<ServiceType, Complexity> = {
  REVISAO: "BAIXA",
  PREVENTIVA: "BAIXA",
  CORRETIVA: "MEDIA",
  DIAGNOSTICO: "MEDIA",
  DIAGNOSTICO_COMPLEXO: "ALTA",
};

const COMPLEXITY_RANK: Record<Complexity, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };

/**
 * Complexidade máxima por nível.
 * Regra 03: Assistente não assume Diagnóstico Complexo (aqui, só serviços de baixa complexidade).
 * Regra 04: JR executa apenas serviços compatíveis (baixa e média).
 */
export const LEVEL_MAX_COMPLEXITY: Record<TechnicianLevel, Complexity> = {
  ASSISTENTE: "BAIXA",
  JR: "MEDIA",
  PLENO: "ALTA",
  SR: "ALTA",
};

export function levelCanExecute(level: TechnicianLevel, service: ServiceType): boolean {
  return COMPLEXITY_RANK[LEVEL_MAX_COMPLEXITY[level]] >= COMPLEXITY_RANK[SERVICE_COMPLEXITY[service]];
}

/** Boxes aceitos por tipo de serviço, em ordem de preferência. */
export const SERVICE_BOX_CATEGORIES: Record<ServiceType, BoxCategory[]> = {
  REVISAO: ["RAPIDO", "GERAL"],
  PREVENTIVA: ["RAPIDO", "GERAL"],
  CORRETIVA: ["GERAL"],
  DIAGNOSTICO: ["DIAGNOSTICO", "GERAL"],
  DIAGNOSTICO_COMPLEXO: ["DIAGNOSTICO", "GERAL"],
};

export function isDiagnostic(service: ServiceType): boolean {
  return service === "DIAGNOSTICO" || service === "DIAGNOSTICO_COMPLEXO";
}
