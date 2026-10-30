import Link from "next/link";
import { GetDashboardUseCase } from "@/application/use-cases/get-dashboard";
import { getRepository } from "@/infrastructure/container";
import { GoldTag, PriorityBadge, StatusBadge } from "@/presentation/components/badges";
import { PageHeader } from "@/presentation/components/page-header";
import { QueueTable } from "@/presentation/components/queue-table";
import { SERVICE_LABEL } from "@/shared/constants";
import { formatDateTime, formatHours, hoursBetween } from "@/shared/utils/time";

export default async function WorkOrdersPage() {
  const now = new Date();
  const data = await new GetDashboardUseCase(getRepository()).execute(now);
  const techById = new Map(data.technicians.map((t) => [t.id, t]));
  const boxById = new Map(data.boxes.map((b) => [b.id, b]));

  const active = data.orders.filter((o) => ["ASSIGNED", "IN_PROGRESS", "PAUSED"].includes(o.status));
  const done = data.orders
    .filter((o) => o.status === "DONE")
    .sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0))
    .slice(0, 15);

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Fila reordenada por prioridade e consumo de SLA. Clique na OS para ver o ranking e aprovar a alocação."
        actions={<Link href="/os/importar" className="btn btn-primary">Importar CSV</Link>}
      />

      <section className="card mb-6" aria-labelledby="fila">
        <h2 id="fila" className="border-b border-line p-4 font-bold">Fila ({data.queue.length})</h2>
        <QueueTable items={data.queue} now={now} />
      </section>

      <section className="card mb-6" aria-labelledby="andamento">
        <h2 id="andamento" className="border-b border-line p-4 font-bold">Em andamento ({active.length})</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Prior.</th><th>OS</th><th>Serviço</th><th>Status</th><th>Mecânico</th><th>Box</th><th>Prazo</th></tr>
            </thead>
            <tbody>
              {active.map((o) => (
                <tr key={o.id}>
                  <td><PriorityBadge priority={o.priority} /></td>
                  <td>
                    <Link href={`/os/${o.id}`} className="font-semibold hover:underline">{o.osNumber}</Link>
                    {o.planGold && <GoldTag />}
                    {o.partsMissing && <span className="ml-1 text-xs font-bold text-p1">PEÇA</span>}
                  </td>
                  <td>{SERVICE_LABEL[o.serviceType]}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.assignedTechnicianId ? techById.get(o.assignedTechnicianId)?.name : "—"}</td>
                  <td>{o.assignedBoxId ? boxById.get(o.assignedBoxId)?.code : "—"}</td>
                  <td className="whitespace-nowrap">{formatDateTime(o.promisedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="concluidas">
        <h2 id="concluidas" className="border-b border-line p-4 font-bold">Concluídas recentemente</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>OS</th><th>Serviço</th><th>Mecânico</th><th>Lead Time</th><th>No prazo</th><th>Retrabalho</th></tr>
            </thead>
            <tbody>
              {done.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/os/${o.id}`} className="font-semibold hover:underline">{o.osNumber}</Link>
                    {o.planGold && <GoldTag />}
                  </td>
                  <td>{SERVICE_LABEL[o.serviceType]}</td>
                  <td>{o.assignedTechnicianId ? techById.get(o.assignedTechnicianId)?.name : "—"}</td>
                  <td className="tabular-nums">{formatHours(hoursBetween(o.arrivedAt, o.finishedAt!))}</td>
                  <td>{!o.promisedDate ? "—" : o.finishedAt! <= o.promisedDate ? <span className="text-done">Sim</span> : <span className="text-p1">Não</span>}</td>
                  <td>{o.rework ? <span className="text-p1">Sim</span> : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
