import type {
  Alert,
  NewAlert,
  NewWorkOrder,
  Skill,
  Technician,
  WorkOrder,
  WorkshopBox,
} from "@/domain/entities";

/** Contrato de persistência. Implementado em memória (modo demo) e no Supabase. */
export interface WorkshopRepository {
  listWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | null>;
  insertWorkOrders(orders: NewWorkOrder[]): Promise<WorkOrder[]>;
  updateWorkOrder(id: string, patch: Partial<NewWorkOrder>): Promise<WorkOrder>;

  listTechnicians(): Promise<Technician[]>;
  saveTechnician(tech: Omit<Technician, "id"> & { id?: string }): Promise<Technician>;

  listBoxes(): Promise<WorkshopBox[]>;
  saveBox(box: Omit<WorkshopBox, "id" | "updatedAt"> & { id?: string }): Promise<WorkshopBox>;

  listSkills(): Promise<Skill[]>;

  listAlerts(): Promise<Alert[]>;
  insertAlerts(alerts: NewAlert[]): Promise<void>;
  resolveAlerts(ids: string[]): Promise<void>;
}
