// Parâmetros operacionais do PCP 360°. Valores iniciais — ajustar com a operação.

export const MATCHING_WEIGHTS = {
  sla: 0.5,
  availability: 0.2,
  skill: 0.2,
  certification: 0.05,
  productivity: 0.05,
} as const;

export const OPERATION_CONFIG = {
  /** OS vira P2 se o prazo prometido estiver a menos de (horas estimadas + esta folga). */
  slaNearSlackHours: 12,
  /** Fração do SLA consumida que dispara o alerta "SLA em risco". */
  slaRiskThreshold: 0.8,
  /** Minutos sem atualização para considerar o box parado. */
  boxIdleMinutes: 30,
  /** Início e duração do turno, usados na utilização de mecânicos. */
  shiftStartHour: 7,
  shiftHours: 9,
} as const;

export const PRIORITY_META = {
  P1: { label: "P1 · Máxima", color: "#DC2626" },
  P2: { label: "P2 · Operacional", color: "#B45309" },
  P3: { label: "P3 · Programada", color: "#2563EB" },
} as const;

export const DONE_COLOR = "#047857";

export const STATUS_LABEL = {
  WAITING: "Aguardando",
  ASSIGNED: "Alocada",
  IN_PROGRESS: "Em execução",
  PAUSED: "Pausada",
  DONE: "Concluída",
} as const;

export const SERVICE_LABEL = {
  REVISAO: "Revisão",
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  DIAGNOSTICO: "Diagnóstico",
  DIAGNOSTICO_COMPLEXO: "Diagnóstico Complexo",
} as const;

export const LEVEL_LABEL = {
  ASSISTENTE: "Assistente",
  JR: "Júnior",
  PLENO: "Pleno",
  SR: "Sênior",
} as const;

export const BOX_STATUS_LABEL = {
  AVAILABLE: "Livre",
  OCCUPIED: "Ocupado",
  MAINTENANCE: "Manutenção",
} as const;

export const BOX_CATEGORY_LABEL = {
  GERAL: "Geral",
  DIAGNOSTICO: "Diagnóstico",
  RAPIDO: "Rápido",
} as const;

export const SEVERITY_LABEL = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Médio",
  INFO: "Info",
} as const;
