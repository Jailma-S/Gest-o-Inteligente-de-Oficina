import { beforeEach, describe, expect, it } from "vitest";
import { AssignTechnicianUseCase } from "@/application/use-cases/assign-technician";
import { ExecuteWorkOrderUseCase } from "@/application/use-cases/execute-work-order";
import { GenerateAlertsUseCase } from "@/application/use-cases/generate-alerts";
import { ImportOSUseCase } from "@/application/use-cases/import-os";
import { ReorganizeQueueUseCase } from "@/application/use-cases/reorganize-queue";
import { MemoryWorkshopRepository, resetDemoStore } from "@/infrastructure/repositories/memory-repository";

const CSV = `os_number;plate;service_type;estimated_hours;plan_gold;sensitive_cargo;promised_date;required_skill
OS-9001;AAA1B11;Diagnóstico Complexo;4;Sim;Não;31/12/2099 18:00;Diagnóstico eletrônico
OS-9002;BBB2C22;Preventiva;1,5;Não;Não;;Freios e suspensão
OS-9003;CCC3D33;Lavagem;1;Não;Não;;
OS-9004;DDD4E44;Revisão;abc;Não;Não;;
OS-9005;EEE5F55;Corretiva;2;Não;Não;;Skill inexistente`;

describe("casos de uso (repositório em memória)", () => {
  let repo: MemoryWorkshopRepository;
  beforeEach(() => {
    resetDemoStore();
    repo = new MemoryWorkshopRepository();
  });

  it("importa CSV validando linhas, prioriza e gera alerta de Plano Ouro", async () => {
    const result = await new ImportOSUseCase(repo).execute(CSV);
    expect(result.imported).toBe(2);
    expect(result.errors.map((e) => e.line)).toEqual([4, 5, 6]);

    const orders = await repo.listWorkOrders();
    expect(orders.find((o) => o.osNumber === "OS-9001")?.priority).toBe("P1");
    expect(orders.find((o) => o.osNumber === "OS-9002")?.priority).toBe("P3");
    expect((await repo.listAlerts()).some((a) => a.type === "GOLD_ARRIVED")).toBe(true);

    const again = await new ImportOSUseCase(repo).execute(CSV);
    expect(again.imported).toBe(0);
    expect(again.duplicates).toEqual(["OS-9001", "OS-9002"]);
  });

  it("fila reorganizada não sugere o mesmo box para duas OS", async () => {
    const [orders, techs, boxes] = await Promise.all([repo.listWorkOrders(), repo.listTechnicians(), repo.listBoxes()]);
    const plan = new ReorganizeQueueUseCase().execute(orders, techs, boxes, new Date());
    const codes = plan.map((p) => p.box?.code).filter(Boolean);
    expect(new Set(codes).size).toBe(codes.length);
    expect(plan[0].order.priority).toBe("P1");
  });

  it("fluxo completo: sugerir → aprovar → iniciar → concluir libera o box", async () => {
    const waiting = (await repo.listWorkOrders()).find((o) => o.status === "WAITING" && o.serviceType === "REVISAO")!;
    const assign = new AssignTechnicianUseCase(repo);
    const suggestion = (await assign.suggest(waiting.id))!;
    const best = suggestion.candidates.find((c) => c.eligible)!;

    await assign.approve(waiting.id, best.technician.id, suggestion.recommendedBox!.id);
    const box = (await repo.listBoxes()).find((b) => b.id === suggestion.recommendedBox!.id)!;
    expect(box.status).toBe("OCCUPIED");

    const exec = new ExecuteWorkOrderUseCase(repo);
    await exec.execute(waiting.id, "start");
    await exec.execute(waiting.id, "finish");
    const done = (await repo.getWorkOrder(waiting.id))!;
    expect(done.status).toBe("DONE");
    expect(done.finishedAt).not.toBeNull();
    expect((await repo.listBoxes()).find((b) => b.id === box.id)!.status).toBe("AVAILABLE");
  });

  it("bloqueia alocação que viola as regras", async () => {
    const complex = (await repo.listWorkOrders()).find((o) => o.status === "WAITING" && o.serviceType === "DIAGNOSTICO_COMPLEXO")!;
    const assign = new AssignTechnicianUseCase(repo);
    await expect(assign.approve(complex.id, "t7", "box-B05")).rejects.toThrow(/Regra 03/);
    await expect(assign.approve(complex.id, "t1", "box-B03")).rejects.toThrow(/Regra 06/);
  });

  it("alertas não duplicam e se resolvem quando a condição some", async () => {
    const alerts = new GenerateAlertsUseCase(repo);
    const first = (await alerts.execute()).filter((a) => !a.resolved);
    const second = (await alerts.execute()).filter((a) => !a.resolved);
    expect(second.length).toBe(first.length);

    const parts = first.find((a) => a.type === "PARTS_MISSING")!;
    await new ExecuteWorkOrderUseCase(repo).execute(parts.workOrderId!, "toggleParts");
    const after = await alerts.execute();
    expect(after.find((a) => a.id === parts.id)?.resolved).toBe(true);
  });
});
