import { afterAll, describe, expect, it } from "vitest";
import { AssignTechnicianUseCase } from "@/application/use-cases/assign-technician";
import { ExecuteWorkOrderUseCase } from "@/application/use-cases/execute-work-order";
import { GenerateAlertsUseCase } from "@/application/use-cases/generate-alerts";
import { ImportOSUseCase } from "@/application/use-cases/import-os";
import { SupabaseWorkshopRepository } from "@/infrastructure/repositories/supabase-repository";
import { getServerSupabase, isSupabaseConfigured } from "@/infrastructure/supabase/client";

// Teste contra o banco real. Roda só com `npm run test:supabase` (lê o .env.local).
// Cria registros com prefixo TESTE- e apaga tudo no final.

const PREFIX = "TESTE-";

describe.skipIf(!isSupabaseConfigured())("integração Supabase", () => {
  const db = isSupabaseConfigured() ? getServerSupabase() : null!;
  const repo = isSupabaseConfigured() ? new SupabaseWorkshopRepository(db) : null!;

  afterAll(async () => {
    const { data: orders } = await db.from("work_orders").select("id").like("os_number", `${PREFIX}%`);
    const ids = (orders ?? []).map((o) => o.id);
    if (ids.length) {
      await db.from("boxes").update({ current_work_order: null }).in("current_work_order", ids);
      await db.from("work_orders").delete().in("id", ids);
    }
    await db.from("boxes").delete().like("code", `${PREFIX}%`);
    await db.from("technicians").delete().like("name", `${PREFIX}%`);
  });

  it("fluxo completo: cadastro → importação → sugestão → aprovação → execução → alertas", async () => {
    const skills = await repo.listSkills();
    const motor = skills.find((s) => s.name === "Motor")!;
    expect(motor).toBeDefined();

    const tech = await repo.saveTechnician({
      name: `${PREFIX}Mecânico`,
      level: "SR",
      productivityScore: 90,
      available: true,
      active: true,
      skills: [{ skillId: motor.id, proficiency: 5, certified: true }],
    });
    const box = await repo.saveBox({ code: `${PREFIX}B1`, category: "GERAL", status: "AVAILABLE", currentWorkOrderId: null });

    const saved = (await repo.listTechnicians()).find((t) => t.id === tech.id)!;
    expect(saved.skills).toEqual([{ skillId: motor.id, proficiency: 5, certified: true }]);

    const csv = `os_number;plate;service_type;estimated_hours;plan_gold;promised_date;required_skill
${PREFIX}OS1;TST1A11;Corretiva;2;Sim;31/12/2099 18:00;Motor`;
    const result = await new ImportOSUseCase(repo).execute(csv);
    expect(result).toEqual({ imported: 1, duplicates: [], errors: [] });

    const order = (await repo.listWorkOrders()).find((o) => o.osNumber === `${PREFIX}OS1`)!;
    expect(order.priority).toBe("P1");
    expect(order.requiredSkillId).toBe(motor.id);

    const assign = new AssignTechnicianUseCase(repo);
    const suggestion = (await assign.suggest(order.id))!;
    expect(suggestion.boxes.map((b) => b.id)).toContain(box.id);

    await assign.approve(order.id, tech.id, box.id);
    expect((await repo.listBoxes()).find((b) => b.id === box.id)!.status).toBe("OCCUPIED");

    const exec = new ExecuteWorkOrderUseCase(repo);
    await exec.execute(order.id, "start");
    await exec.execute(order.id, "toggleParts");
    const alerts = await new GenerateAlertsUseCase(repo).execute();
    expect(alerts.some((a) => a.workOrderId === order.id && a.type === "PARTS_MISSING" && !a.resolved)).toBe(true);
    expect(alerts.some((a) => a.workOrderId === order.id && a.type === "GOLD_ARRIVED")).toBe(true);

    await exec.execute(order.id, "finish");
    const done = (await repo.getWorkOrder(order.id))!;
    expect(done.status).toBe("DONE");
    expect(done.startedAt).not.toBeNull();
    expect(done.finishedAt).not.toBeNull();
    expect((await repo.listBoxes()).find((b) => b.id === box.id)!.status).toBe("AVAILABLE");
  }, 60_000);
});
