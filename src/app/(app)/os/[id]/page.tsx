import Link from "next/link";
import { notFound } from "next/navigation";
import { executeWorkOrderAction } from "@/app/actions";
import { AssignTechnicianUseCase } from "@/application/use-cases/assign-technician";
import type { WorkOrder } from "@/domain/entities";
import { slaConsumption } from "@/domain/value-objects/sla";
import { getRepository } from "@/infrastructure/container";
import { ApprovalForm } from "@/presentation/components/approval-form";
import { GoldTag, PriorityBadge, StatusBadge } from "@/presentation/components/badges";
import { PageHeader } from "@/presentation/components/page-header";
import { LEVEL_LABEL, MATCHING_WEIGHTS, SERVICE_LABEL } from "@/shared/constants";
import { formatDateTime, formatHours, hoursBetween } from "@/shared/utils/time";

const BREAKDOWN_LABEL = {
  sla: "SLA",
  availability: "Disponib.",
  skill: "Skill",
  certification: "Certif.",
  productivity: "Produt.",
} as const;

function ActionButton({ order, action, label, primary = false }: { order: WorkOrder; action: string; label: string; primary?: boolean }) {
  return (
    <form action={executeWorkOrderAction}>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="action" value={action} />
      <button className={`btn ${primary ? "btn-primary" : ""}`}>{label}</button>
    </form>
  );
}

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  const repo = getRepository();
  const suggestion = await new AssignTechnicianUseCase(repo).suggest(id, now);
  if (!suggestion) notFound();

  const { order, candidates } = suggestion;
  const [skills, boxes] = await Promise.all([repo.listSkills(), repo.listBoxes()]);
  const skillName = skills.find((s) => s.id === order.requiredSkillId)?.name ?? "—";
  const assignedTech = candidates.find((c) => c.technician.id === order.assignedTechnicianId)?.technician;
  const assignedBox = boxes.find((b) => b.id === order.assignedBoxId);
  const sla = slaConsumption(order, now);

  return (
    <>
      <Link href="/os" className="mb-3 inline-block text-sm text-muted hover:text-ink">← Ordens de Serviço</Link>
      <PageHeader
        title={order.osNumber}
        subtitle={`${order.customerName ?? "Cliente não informado"} · ${order.plate ?? "sem placa"}${order.chassis ? ` · chassi ${order.chassis}` : ""}`}
        actions={
          <>
            {order.status === "ASSIGNED" && <ActionButton order={order} action="start" label="Iniciar" primary />}
            {order.status === "IN_PROGRESS" && <ActionButton order={order} action="pause" label="Pausar" />}
            {order.status === "PAUSED" && <ActionButton order={order} action="resume" label="Retomar" primary />}
            {(order.status === "IN_PROGRESS" || order.status === "PAUSED") && <ActionButton order={order} action="finish" label="Concluir" primary />}
            {order.status === "DONE" && !order.rework && <ActionButton order={order} action="rework" label="Registrar retrabalho" />}
            {order.status !== "DONE" && (
              <ActionButton order={order} action="toggleParts" label={order.partsMissing ? "Peça chegou" : "Peça indisponível"} />
            )}
          </>
        }
      />

      <section className="card mb-6 grid grid-cols-2 gap-4 p-4 md:grid-cols-4" aria-label="Dados da OS">
        <Info label="Prioridade"><PriorityBadge priority={order.priority} /> <span className="text-sm text-muted">{order.priorityReason}</span>{order.planGold && <GoldTag />}</Info>
        <Info label="Status"><StatusBadge status={order.status} /></Info>
        <Info label="Serviço">{SERVICE_LABEL[order.serviceType]}</Info>
        <Info label="Skill exigida">{skillName}</Info>
        <Info label="Horas estimadas">{formatHours(order.estimatedHours)}</Info>
        <Info label="Chegada">{formatDateTime(order.arrivedAt)}</Info>
        <Info label="Prazo prometido">{formatDateTime(order.promisedDate)}</Info>
        <Info label="SLA consumido">
          <span className={sla !== null && sla >= 0.8 ? "font-bold text-p1" : ""}>{sla === null ? "—" : `${Math.round(sla * 100)}%`}</span>
        </Info>
        <Info label="Mecânico">{assignedTech?.name ?? "—"}</Info>
        <Info label="Box">{assignedBox?.code ?? "—"}</Info>
        <Info label="Início">{formatDateTime(order.startedAt)}</Info>
        <Info label="Fim">{formatDateTime(order.finishedAt)}</Info>
      </section>

      {order.status === "WAITING" && (
        <>
          <section className="card mb-6 p-4" aria-labelledby="recomendacao">
            <h2 id="recomendacao" className="mb-2 font-bold">Recomendação</h2>
            <p className="text-sm leading-relaxed">{suggestion.justification}</p>
          </section>

          <section className="card mb-6" aria-labelledby="ranking">
            <div className="border-b border-line p-4">
              <h2 id="ranking" className="font-bold">Ranking de candidatos</h2>
              <p className="mt-1 text-xs text-muted">
                Score = SLA {MATCHING_WEIGHTS.sla * 100}% · Disponibilidade {MATCHING_WEIGHTS.availability * 100}% · Skill {MATCHING_WEIGHTS.skill * 100}% · Certificação {MATCHING_WEIGHTS.certification * 100}% · Produtividade {MATCHING_WEIGHTS.productivity * 100}%
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th><th>Mecânico</th><th>Score</th>
                    {Object.values(BREAKDOWN_LABEL).map((l) => <th key={l}>{l}</th>)}
                    <th>Livre em</th><th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => (
                    <tr key={c.technician.id} className={c.eligible ? "" : "opacity-60"}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>
                        <span className="font-semibold">{c.technician.name}</span>
                        <div className="text-xs text-muted">{LEVEL_LABEL[c.technician.level]}</div>
                      </td>
                      <td className="text-lg font-extrabold tabular-nums">{c.eligible ? c.score.toFixed(0) : "—"}</td>
                      {(Object.keys(BREAKDOWN_LABEL) as (keyof typeof BREAKDOWN_LABEL)[]).map((k) => (
                        <td key={k} className="tabular-nums text-muted">{Math.round(c.breakdown[k])}</td>
                      ))}
                      <td className="tabular-nums">{formatHours(Math.max(0, hoursBetween(now, c.freeAt)))}</td>
                      <td>{c.eligible ? <span className="text-done">Elegível</span> : <span className="text-p2">{c.blockedBy}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ApprovalForm
            orderId={order.id}
            candidates={candidates.filter((c) => c.eligible).map((c) => ({ id: c.technician.id, label: `${c.technician.name} · ${c.score.toFixed(0)}` }))}
            boxes={suggestion.boxes.map((b) => ({ id: b.id, label: b.code }))}
          />
        </>
      )}
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}
