import Link from "next/link";
import { GetDashboardUseCase } from "@/application/use-cases/get-dashboard";
import { getRepository } from "@/infrastructure/container";
import { SeverityBadge } from "@/presentation/components/badges";
import { BoxCard } from "@/presentation/components/box-card";
import { KpiTile, formatPct } from "@/presentation/components/kpi-tile";
import { PageHeader } from "@/presentation/components/page-header";
import { QueueTable } from "@/presentation/components/queue-table";
import { formatHours } from "@/shared/utils/time";

export default async function DashboardPage() {
  const now = new Date();
  const data = await new GetDashboardUseCase(getRepository()).execute(now);
  const { kpis } = data;
  const orderById = new Map(data.orders.map((o) => [o.id, o]));
  const techById = new Map(data.technicians.map((t) => [t.id, t]));
  const openAlerts = data.alerts.filter((a) => !a.resolved);

  return (
    <>
      <PageHeader
        title="Torre de Controle"
        subtitle={`${kpis.queueSize} OS na fila · ${kpis.inProgress} em execução · ${kpis.boxesOccupied}/${kpis.boxesTotal} boxes ocupados`}
        actions={
          <>
            <Link href="/os/importar" className="btn btn-primary">Importar OS</Link>
            <Link href="/tv" className="btn">Painel TV</Link>
          </>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label="Indicadores">
        <KpiTile label="Lead Time" value={formatHours(kpis.leadTime)} hint="Chegada → entrega · 7 dias" />
        <KpiTile label="Waiting Time" value={formatHours(kpis.waitingTime)} hint="Chegada → início" tone={kpis.waitingTime !== null && kpis.waitingTime > 2 ? "warn" : "default"} />
        <KpiTile label="Touch Time" value={formatHours(kpis.touchTime)} hint="Tempo efetivo de manutenção" />
        <KpiTile label="First Time Right" value={formatPct(kpis.firstTimeRight)} hint="OS sem retrabalho" tone={kpis.firstTimeRight !== null && kpis.firstTimeRight < 0.9 ? "warn" : "good"} />
        <KpiTile label="Aderência Plano Ouro" value={formatPct(kpis.goldAdherence)} hint="Meta 100%" tone={kpis.goldAdherence === null || kpis.goldAdherence >= 1 ? "good" : "bad"} />
        <KpiTile label="Utilização mecânicos" value={formatPct(kpis.technicianUtilization)} hint="Horas produtivas hoje" />
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-2" aria-labelledby="fila">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 id="fila" className="font-bold">Fila priorizada e sugestão de alocação</h2>
            <Link href="/os" className="text-sm text-accent hover:underline">Ver todas</Link>
          </div>
          <QueueTable items={data.queue.slice(0, 8)} now={now} />
        </section>

        <div className="flex flex-col gap-6">
          <section className="card p-4" aria-labelledby="gargalos">
            <h2 id="gargalos" className="mb-3 font-bold">Análise de gargalos</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {data.bottlenecks.map((b) => (
                <li key={b} className="rounded-lg bg-surface-2 p-2">{b}</li>
              ))}
            </ul>
          </section>
          <section className="card p-4" aria-labelledby="alertas">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="alertas" className="font-bold">Alertas abertos</h2>
              <Link href="/alertas" className="text-sm text-accent hover:underline">{openAlerts.length} no total</Link>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {openAlerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span>{a.message}</span>
                </li>
              ))}
              {!openAlerts.length && <li className="text-muted">Nenhum alerta aberto.</li>}
            </ul>
          </section>
        </div>
      </div>

      <section aria-labelledby="boxes">
        <h2 id="boxes" className="mb-3 font-bold">Boxes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.boxes.map((box) => {
            const order = box.currentWorkOrderId ? orderById.get(box.currentWorkOrderId) : undefined;
            return (
              <BoxCard
                key={box.id}
                box={box}
                order={order}
                technician={order?.assignedTechnicianId ? techById.get(order.assignedTechnicianId) : undefined}
                now={now}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}
