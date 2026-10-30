import type { Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import type { Candidate } from "@/domain/rules/matching";
import { LEVEL_LABEL } from "@/shared/constants";
import { formatHours, hoursBetween } from "@/shared/utils/time";

// Justificativas determinísticas e auditáveis, geradas a partir do score.
// Ponto de extensão para um provedor LLM (Claude, OpenAI, Azure, Gemini) na próxima fase.

export function explainRecommendation(
  order: WorkOrder,
  best: Candidate | undefined,
  runnerUp: Candidate | undefined,
  box: WorkshopBox | undefined,
): string {
  if (!best || !best.eligible) {
    return "Nenhum mecânico elegível no momento. Verifique o turno, os níveis exigidos e a matriz de skills.";
  }
  const parts: string[] = [];
  const t = best.technician;
  parts.push(`${t.name} (${LEVEL_LABEL[t.level]}) tem o maior score: ${best.score.toFixed(0)}.`);

  if (order.promisedDate) {
    const slack = hoursBetween(best.projectedFinish, order.promisedDate);
    parts.push(
      slack >= 0
        ? `Término projetado com folga de ${formatHours(slack)} sobre o prazo prometido.`
        : `Atenção: mesmo com essa alocação, o término projetado estoura o prazo em ${formatHours(-slack)}.`,
    );
  }
  parts.push(best.breakdown.availability >= 100 ? "Disponível agora." : `Fica livre em ${formatHours(hoursBetween(new Date(), best.freeAt))}.`);
  if (best.breakdown.certification === 100) parts.push("Certificado na skill exigida.");
  if (runnerUp?.eligible) {
    parts.push(`Segunda opção: ${runnerUp.technician.name} (${runnerUp.score.toFixed(0)}).`);
  }
  parts.push(box ? `Box sugerido: ${box.code}.` : "Nenhum box compatível livre — OS segue na fila.");
  return parts.join(" ");
}

export function summarizeBottlenecks(
  queue: WorkOrder[],
  boxes: WorkshopBox[],
  technicians: Technician[],
  freeAt: Map<string, Date>,
  now: Date,
): string[] {
  const findings: string[] = [];
  const idleBoxes = boxes.filter((b) => b.status === "AVAILABLE");
  const freeTechs = technicians.filter(
    (t) => t.active && t.available && (!freeAt.get(t.id) || freeAt.get(t.id)! <= now),
  );
  const p1Waiting = queue.filter((o) => o.priority === "P1");

  if (p1Waiting.length) findings.push(`${p1Waiting.length} OS P1 aguardando alocação — tratar primeiro.`);
  if (idleBoxes.length && queue.length && !freeTechs.length) {
    findings.push(`Gargalo em mão de obra: ${idleBoxes.length} box(es) livre(s), mas nenhum mecânico livre.`);
  }
  if (freeTechs.length && queue.length && !idleBoxes.length) {
    findings.push(`Gargalo em box: ${freeTechs.length} mecânico(s) livre(s), mas nenhum box disponível.`);
  }
  if (idleBoxes.length && !queue.length) findings.push(`${idleBoxes.length} box(es) ocioso(s) sem fila — antecipar preventivas agendadas.`);

  const overloaded = technicians.filter((t) => {
    const until = freeAt.get(t.id);
    return until && hoursBetween(now, until) > 8;
  });
  if (overloaded.length) {
    findings.push(`Sobrecarga: ${overloaded.map((t) => t.name).join(", ")} com mais de 8h de carteira.`);
  }
  if (!findings.length) findings.push("Fluxo equilibrado: sem gargalos detectados.");
  return findings;
}
