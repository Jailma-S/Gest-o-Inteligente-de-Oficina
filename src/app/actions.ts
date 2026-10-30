"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ImportResult } from "@/application/dto";
import { AssignTechnicianUseCase } from "@/application/use-cases/assign-technician";
import { ExecuteWorkOrderUseCase, type ExecutionAction } from "@/application/use-cases/execute-work-order";
import { ImportOSUseCase } from "@/application/use-cases/import-os";
import type { BoxCategory, BoxStatus, TechnicianLevel, TechnicianSkill } from "@/domain/entities";
import { dataMode, getRepository } from "@/infrastructure/container";
import { resetDemoStore } from "@/infrastructure/repositories/memory-repository";

export type ActionState = { error?: string; ok?: string } | null;

function refreshAll() {
  revalidatePath("/", "layout");
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Erro inesperado.";
}

export async function importOsAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { imported: 0, duplicates: [], errors: [{ line: 0, message: "Selecione um arquivo CSV." }] };
  }
  if (file.size > 5_000_000) {
    return { imported: 0, duplicates: [], errors: [{ line: 0, message: "Arquivo acima de 5 MB." }] };
  }
  const result = await new ImportOSUseCase(getRepository()).execute(await file.text());
  refreshAll();
  return result;
}

export async function approveAllocationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const orderId = String(formData.get("orderId"));
  try {
    await new AssignTechnicianUseCase(getRepository()).approve(
      orderId,
      String(formData.get("technicianId") ?? ""),
      String(formData.get("boxId") ?? ""),
    );
  } catch (err) {
    return { error: message(err) };
  }
  refreshAll();
  redirect(`/os/${orderId}`);
}

export async function executeWorkOrderAction(formData: FormData): Promise<void> {
  await new ExecuteWorkOrderUseCase(getRepository()).execute(
    String(formData.get("orderId")),
    String(formData.get("action")) as ExecutionAction,
  );
  refreshAll();
}

export async function saveTechnicianAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome." };
  const repo = getRepository();
  const skills: TechnicianSkill[] = (await repo.listSkills())
    .map((s) => ({
      skillId: s.id,
      proficiency: Number(formData.get(`prof_${s.id}`) ?? 0),
      certified: formData.get(`cert_${s.id}`) === "on",
    }))
    .filter((s) => s.proficiency > 0);
  try {
    await repo.saveTechnician({
      name,
      level: String(formData.get("level")) as TechnicianLevel,
      productivityScore: Math.max(0, Math.min(100, Number(formData.get("productivity") ?? 70))),
      available: formData.get("available") === "on",
      active: true,
      skills,
    });
  } catch (err) {
    return { error: message(err) };
  }
  refreshAll();
  return { ok: `${name} cadastrado.` };
}

export async function toggleTechnicianAction(formData: FormData): Promise<void> {
  const repo = getRepository();
  const tech = (await repo.listTechnicians()).find((t) => t.id === formData.get("id"));
  if (!tech) return;
  const field = formData.get("field") === "active" ? "active" : "available";
  await repo.saveTechnician({ ...tech, [field]: !tech[field] });
  refreshAll();
}

export async function saveBoxAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Informe o código do box." };
  try {
    await getRepository().saveBox({
      code,
      category: String(formData.get("category")) as BoxCategory,
      status: "AVAILABLE",
      currentWorkOrderId: null,
    });
  } catch (err) {
    return { error: message(err) };
  }
  refreshAll();
  return { ok: `Box ${code} cadastrado.` };
}

export async function setBoxStatusAction(formData: FormData): Promise<void> {
  const repo = getRepository();
  const box = (await repo.listBoxes()).find((b) => b.id === formData.get("id"));
  if (!box || box.status === "OCCUPIED") return;
  await repo.saveBox({ ...box, status: String(formData.get("status")) as BoxStatus });
  refreshAll();
}

export async function resolveAlertAction(formData: FormData): Promise<void> {
  await getRepository().resolveAlerts([String(formData.get("id"))]);
  refreshAll();
}

export async function resetDemoAction(): Promise<void> {
  if (dataMode() !== "demo") return;
  resetDemoStore();
  refreshAll();
}
