import type { NewWorkOrder, ServiceType } from "@/domain/entities";
import type { WorkshopRepository } from "@/domain/repositories";
import { goldArrivedAlert } from "@/domain/rules/alerts";
import { calculatePriority } from "@/domain/rules/priority";
import type { ImportError, ImportResult } from "../dto";
import { normalizeKey, parseBoolean, parseCsv, parseDate, parseNumber } from "../services/csv";

const SERVICE_TYPES: ServiceType[] = ["REVISAO", "PREVENTIVA", "CORRETIVA", "DIAGNOSTICO", "DIAGNOSTICO_COMPLEXO"];

export const CSV_COLUMNS = [
  "os_number",
  "plate",
  "chassis",
  "customer_name",
  "service_type",
  "estimated_hours",
  "plan_gold",
  "sensitive_cargo",
  "promised_date",
  "required_skill",
  "parts_missing",
] as const;

export class ImportOSUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  async execute(csvText: string, now: Date = new Date()): Promise<ImportResult> {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return { imported: 0, duplicates: [], errors: [{ line: 1, message: "Arquivo vazio ou sem linhas de dados." }] };
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: (typeof CSV_COLUMNS)[number]) => header.indexOf(name);
    const missing = ["os_number", "service_type", "estimated_hours"].filter((c) => !header.includes(c));
    if (missing.length) {
      return { imported: 0, duplicates: [], errors: [{ line: 1, message: `Colunas obrigatórias ausentes: ${missing.join(", ")}` }] };
    }

    const [existing, skills] = await Promise.all([this.repo.listWorkOrders(), this.repo.listSkills()]);
    const known = new Set(existing.map((o) => o.osNumber));
    const skillByName = new Map(skills.map((s) => [normalizeKey(s.name), s.id]));

    const errors: ImportError[] = [];
    const duplicates: string[] = [];
    const toInsert: NewWorkOrder[] = [];

    rows.slice(1).forEach((cells, idx) => {
      const line = idx + 2;
      const get = (name: (typeof CSV_COLUMNS)[number]) => (col(name) >= 0 ? cells[col(name)]?.trim() ?? "" : "");

      const osNumber = get("os_number");
      if (!osNumber) return errors.push({ line, message: "os_number vazio." });
      if (known.has(osNumber)) return duplicates.push(osNumber);

      const serviceType = normalizeKey(get("service_type")) as ServiceType;
      if (!SERVICE_TYPES.includes(serviceType)) {
        return errors.push({ line, message: `service_type inválido: "${get("service_type")}".` });
      }

      const estimatedHours = parseNumber(get("estimated_hours"));
      if (estimatedHours === null || estimatedHours <= 0) {
        return errors.push({ line, message: "estimated_hours deve ser um número maior que zero." });
      }

      const promisedDate = parseDate(get("promised_date"));
      if (promisedDate === "invalid") return errors.push({ line, message: "promised_date inválida." });

      const skillName = get("required_skill");
      const requiredSkillId = skillName ? skillByName.get(normalizeKey(skillName)) ?? null : null;
      if (skillName && !requiredSkillId) {
        return errors.push({ line, message: `Skill "${skillName}" não cadastrada.` });
      }

      const base = {
        serviceType,
        estimatedHours,
        planGold: parseBoolean(get("plan_gold")),
        sensitiveCargo: parseBoolean(get("sensitive_cargo")),
        promisedDate,
      };
      const { priority, reason } = calculatePriority(base, now);

      known.add(osNumber);
      toInsert.push({
        ...base,
        osNumber,
        plate: get("plate") || null,
        chassis: get("chassis") || null,
        customerName: get("customer_name") || null,
        requiredSkillId,
        partsMissing: parseBoolean(get("parts_missing")),
        arrivedAt: now,
        priority,
        priorityReason: reason,
        status: "WAITING",
        assignedTechnicianId: null,
        assignedBoxId: null,
        startedAt: null,
        finishedAt: null,
        rework: false,
      });
    });

    if (toInsert.length) {
      const created = await this.repo.insertWorkOrders(toInsert);
      const goldAlerts = created.filter((o) => o.planGold).map(goldArrivedAlert);
      if (goldAlerts.length) await this.repo.insertAlerts(goldAlerts);
    }

    return { imported: toInsert.length, duplicates, errors };
  }
}
