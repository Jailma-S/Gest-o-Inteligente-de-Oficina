import type { Alert, Skill, Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import type { Candidate } from "@/domain/rules/matching";
import type { Kpis } from "@/domain/rules/kpis";

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportResult {
  imported: number;
  duplicates: string[];
  errors: ImportError[];
}

export interface QueuePlanItem {
  position: number;
  order: WorkOrder;
  suggestion: Candidate | null;
  box: WorkshopBox | null;
}

export interface AllocationSuggestion {
  order: WorkOrder;
  candidates: Candidate[];
  boxes: WorkshopBox[];
  recommendedBox: WorkshopBox | null;
  justification: string;
}

export interface DashboardData {
  kpis: Kpis;
  queue: QueuePlanItem[];
  boxes: WorkshopBox[];
  orders: WorkOrder[];
  technicians: Technician[];
  skills: Skill[];
  alerts: Alert[];
  bottlenecks: string[];
}
