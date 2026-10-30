import type { Alert, NewAlert, NewWorkOrder, Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import type { WorkshopRepository } from "@/domain/repositories";
import { buildDemoState, type DemoState } from "./demo-seed";

interface Store extends DemoState {
  alerts: Alert[];
}

// Guardado em globalThis para sobreviver ao hot reload do Next em desenvolvimento.
const globalStore = globalThis as unknown as { __pcp360Store?: Store };

function store(): Store {
  if (!globalStore.__pcp360Store) {
    globalStore.__pcp360Store = { ...buildDemoState(new Date()), alerts: [] };
  }
  return globalStore.__pcp360Store;
}

export function resetDemoStore(): void {
  globalStore.__pcp360Store = undefined;
}

const clone = <T>(value: T): T => structuredClone(value);

export class MemoryWorkshopRepository implements WorkshopRepository {
  async listWorkOrders() {
    return clone(store().workOrders);
  }

  async getWorkOrder(id: string) {
    const found = store().workOrders.find((o) => o.id === id);
    return found ? clone(found) : null;
  }

  async insertWorkOrders(orders: NewWorkOrder[]) {
    const now = new Date();
    const created: WorkOrder[] = orders.map((o) => ({ ...o, id: crypto.randomUUID(), updatedAt: now }));
    store().workOrders.push(...created);
    return clone(created);
  }

  async updateWorkOrder(id: string, patch: Partial<NewWorkOrder>) {
    const order = store().workOrders.find((o) => o.id === id);
    if (!order) throw new Error(`OS ${id} não encontrada`);
    Object.assign(order, patch, { updatedAt: new Date() });
    return clone(order);
  }

  async listTechnicians() {
    return clone(store().technicians);
  }

  async saveTechnician(tech: Omit<Technician, "id"> & { id?: string }) {
    const list = store().technicians;
    const existing = tech.id ? list.find((t) => t.id === tech.id) : undefined;
    if (existing) {
      Object.assign(existing, tech);
      return clone(existing);
    }
    const created: Technician = { ...tech, id: crypto.randomUUID() };
    list.push(created);
    return clone(created);
  }

  async listBoxes() {
    return clone(store().boxes);
  }

  async saveBox(box: Omit<WorkshopBox, "id" | "updatedAt"> & { id?: string }) {
    const list = store().boxes;
    const existing = box.id ? list.find((b) => b.id === box.id) : undefined;
    if (existing) {
      Object.assign(existing, box, { updatedAt: new Date() });
      return clone(existing);
    }
    if (list.some((b) => b.code === box.code)) throw new Error(`Box ${box.code} já existe`);
    const created: WorkshopBox = { ...box, id: crypto.randomUUID(), updatedAt: new Date() };
    list.push(created);
    return clone(created);
  }

  async listSkills() {
    return clone(store().skills);
  }

  async listAlerts() {
    return clone(store().alerts);
  }

  /** Ignora alertas cuja condição já tem alerta aberto (requisições simultâneas). */
  async insertAlerts(alerts: NewAlert[]) {
    const now = new Date();
    const list = store().alerts;
    const open = new Set(list.filter((a) => !a.resolved).map((a) => a.dedupeKey));
    for (const a of alerts) {
      if (open.has(a.dedupeKey)) continue;
      open.add(a.dedupeKey);
      list.push({ ...a, id: crypto.randomUUID(), resolved: false, createdAt: now });
    }
  }

  async resolveAlerts(ids: string[]) {
    for (const alert of store().alerts) {
      if (ids.includes(alert.id)) alert.resolved = true;
    }
  }
}
