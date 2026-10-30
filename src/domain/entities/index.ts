export type PriorityLevel = "P1" | "P2" | "P3";

export type WorkOrderStatus = "WAITING" | "ASSIGNED" | "IN_PROGRESS" | "PAUSED" | "DONE";

export type ServiceType =
  | "REVISAO"
  | "PREVENTIVA"
  | "CORRETIVA"
  | "DIAGNOSTICO"
  | "DIAGNOSTICO_COMPLEXO";

export type Complexity = "BAIXA" | "MEDIA" | "ALTA";

export type TechnicianLevel = "ASSISTENTE" | "JR" | "PLENO" | "SR";

export type BoxStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

export type BoxCategory = "GERAL" | "DIAGNOSTICO" | "RAPIDO";

export type AlertType = "SLA_RISK" | "BOX_IDLE" | "GOLD_ARRIVED" | "PARTS_MISSING";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export interface WorkOrder {
  id: string;
  osNumber: string;
  plate: string | null;
  chassis: string | null;
  customerName: string | null;
  serviceType: ServiceType;
  /** Skill exigida pela OS (id da tabela skills). */
  requiredSkillId: string | null;
  estimatedHours: number;
  planGold: boolean;
  sensitiveCargo: boolean;
  partsMissing: boolean;
  arrivedAt: Date;
  promisedDate: Date | null;
  priority: PriorityLevel;
  priorityReason: string;
  status: WorkOrderStatus;
  assignedTechnicianId: string | null;
  assignedBoxId: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  rework: boolean;
  updatedAt: Date;
}

export type NewWorkOrder = Omit<WorkOrder, "id" | "updatedAt">;

export interface TechnicianSkill {
  skillId: string;
  /** 1 (básico) a 5 (referência). */
  proficiency: number;
  certified: boolean;
}

export interface Technician {
  id: string;
  name: string;
  level: TechnicianLevel;
  /** 0 a 100. */
  productivityScore: number;
  /** Presente no turno e apto a receber OS. */
  available: boolean;
  active: boolean;
  skills: TechnicianSkill[];
}

export interface WorkshopBox {
  id: string;
  code: string;
  category: BoxCategory;
  status: BoxStatus;
  currentWorkOrderId: string | null;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  /** Evita alertas duplicados para a mesma condição. */
  dedupeKey: string;
  workOrderId: string | null;
  boxId: string | null;
  createdAt: Date;
}

export type NewAlert = Omit<Alert, "id" | "resolved" | "createdAt">;
