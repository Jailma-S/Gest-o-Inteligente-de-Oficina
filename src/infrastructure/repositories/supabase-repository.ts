import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Alert,
  NewAlert,
  NewWorkOrder,
  Skill,
  Technician,
  WorkOrder,
  WorkshopBox,
} from "@/domain/entities";
import type { WorkshopRepository } from "@/domain/repositories";

/* eslint-disable @typescript-eslint/no-explicit-any -- linhas cruas do PostgREST */

const toDate = (v: string | null): Date | null => (v ? new Date(v) : null);
const toIso = (v: Date | null | undefined): string | null => (v ? v.toISOString() : null);

function mapWorkOrder(r: any): WorkOrder {
  return {
    id: r.id,
    osNumber: r.os_number,
    plate: r.plate,
    chassis: r.chassis,
    customerName: r.customer_name,
    serviceType: r.service_type,
    requiredSkillId: r.required_skill_id,
    estimatedHours: Number(r.estimated_hours ?? 0),
    planGold: r.plan_gold,
    sensitiveCargo: r.sensitive_cargo,
    partsMissing: r.parts_missing,
    arrivedAt: new Date(r.arrived_at),
    promisedDate: toDate(r.promised_date),
    priority: r.priority,
    priorityReason: r.priority_reason ?? "",
    status: r.status,
    assignedTechnicianId: r.assigned_technician,
    assignedBoxId: r.assigned_box,
    startedAt: toDate(r.started_at),
    finishedAt: toDate(r.finished_at),
    rework: r.rework,
    updatedAt: new Date(r.updated_at),
  };
}

const WO_COLUMNS: Record<keyof NewWorkOrder, string> = {
  osNumber: "os_number",
  plate: "plate",
  chassis: "chassis",
  customerName: "customer_name",
  serviceType: "service_type",
  requiredSkillId: "required_skill_id",
  estimatedHours: "estimated_hours",
  planGold: "plan_gold",
  sensitiveCargo: "sensitive_cargo",
  partsMissing: "parts_missing",
  arrivedAt: "arrived_at",
  promisedDate: "promised_date",
  priority: "priority",
  priorityReason: "priority_reason",
  status: "status",
  assignedTechnicianId: "assigned_technician",
  assignedBoxId: "assigned_box",
  startedAt: "started_at",
  finishedAt: "finished_at",
  rework: "rework",
};

function toWorkOrderRow(patch: Partial<NewWorkOrder>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = WO_COLUMNS[key as keyof NewWorkOrder];
    if (column) row[column] = value instanceof Date ? toIso(value) : value;
  }
  return row;
}

function mapTechnician(r: any): Technician {
  return {
    id: r.id,
    name: r.name,
    level: r.level,
    productivityScore: Number(r.productivity_score ?? 0),
    available: r.available,
    active: r.active,
    skills: (r.technician_skills ?? []).map((s: any) => ({
      skillId: s.skill_id,
      proficiency: s.proficiency,
      certified: s.certified,
    })),
  };
}

function mapBox(r: any): WorkshopBox {
  return {
    id: r.id,
    code: r.code,
    category: r.category,
    status: r.status,
    currentWorkOrderId: r.current_work_order,
    updatedAt: new Date(r.updated_at),
  };
}

function mapAlert(r: any): Alert {
  return {
    id: r.id,
    type: r.type,
    message: r.message,
    severity: r.severity,
    resolved: r.resolved,
    dedupeKey: r.dedupe_key,
    workOrderId: r.work_order_id,
    boxId: r.box_id,
    createdAt: new Date(r.created_at),
  };
}

function check<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as NonNullable<T>;
}

export class SupabaseWorkshopRepository implements WorkshopRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listWorkOrders() {
    return check(await this.db.from("work_orders").select("*")).map(mapWorkOrder);
  }

  async getWorkOrder(id: string) {
    const { data, error } = await this.db.from("work_orders").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapWorkOrder(data) : null;
  }

  async insertWorkOrders(orders: NewWorkOrder[]) {
    const rows = check(await this.db.from("work_orders").insert(orders.map(toWorkOrderRow)).select("*"));
    return rows.map(mapWorkOrder);
  }

  async updateWorkOrder(id: string, patch: Partial<NewWorkOrder>) {
    const row = check(
      await this.db.from("work_orders").update(toWorkOrderRow(patch)).eq("id", id).select("*").single(),
    );
    return mapWorkOrder(row);
  }

  async listTechnicians() {
    const rows = check(
      await this.db.from("technicians").select("*, technician_skills(skill_id, proficiency, certified)"),
    );
    return rows.map(mapTechnician);
  }

  async saveTechnician(tech: Omit<Technician, "id"> & { id?: string }) {
    const row = check(
      await this.db
        .from("technicians")
        .upsert({
          ...(tech.id ? { id: tech.id } : {}),
          name: tech.name,
          level: tech.level,
          productivity_score: tech.productivityScore,
          available: tech.available,
          active: tech.active,
        })
        .select("id")
        .single(),
    );
    check(await this.db.from("technician_skills").delete().eq("technician_id", row.id));
    if (tech.skills.length) {
      check(
        await this.db.from("technician_skills").insert(
          tech.skills.map((s) => ({
            technician_id: row.id,
            skill_id: s.skillId,
            proficiency: s.proficiency,
            certified: s.certified,
          })),
        ),
      );
    }
    return { ...tech, id: row.id };
  }

  async listBoxes() {
    return check(await this.db.from("boxes").select("*").order("code")).map(mapBox);
  }

  async saveBox(box: Omit<WorkshopBox, "id" | "updatedAt"> & { id?: string }) {
    const row = check(
      await this.db
        .from("boxes")
        .upsert({
          ...(box.id ? { id: box.id } : {}),
          code: box.code,
          category: box.category,
          status: box.status,
          current_work_order: box.currentWorkOrderId,
        })
        .select("*")
        .single(),
    );
    return mapBox(row);
  }

  async listSkills(): Promise<Skill[]> {
    return check(await this.db.from("skills").select("id, name, description").order("name"));
  }

  async listAlerts() {
    return check(await this.db.from("alerts").select("*").order("created_at", { ascending: false })).map(mapAlert);
  }

  /** Um insert por alerta: o índice único de alertas abertos barra duplicados (23505) sem derrubar os demais. */
  async insertAlerts(alerts: NewAlert[]) {
    for (const a of alerts) {
      const { error } = await this.db.from("alerts").insert({
        type: a.type,
        message: a.message,
        severity: a.severity,
        dedupe_key: a.dedupeKey,
        work_order_id: a.workOrderId,
        box_id: a.boxId,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    }
  }

  async resolveAlerts(ids: string[]) {
    if (!ids.length) return;
    check(await this.db.from("alerts").update({ resolved: true }).in("id", ids));
  }
}
