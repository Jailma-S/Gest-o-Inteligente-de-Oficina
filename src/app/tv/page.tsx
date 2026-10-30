import { GetDashboardUseCase } from "@/application/use-cases/get-dashboard";
import { getRepository } from "@/infrastructure/container";
import { AutoRefresh } from "@/presentation/components/auto-refresh";
import { PriorityBadge } from "@/presentation/components/badges";
import { remainingHours } from "@/presentation/components/box-card";
import { STATUS_LABEL } from "@/shared/constants";
import { formatHours } from "@/shared/utils/time";

export const dynamic = "force-dynamic";

export const metadata = { title: "PCP 360° · Painel TV" };

const ROW_BORDER = { P1: "border-p1", P2: "border-p2", P3: "border-p3" } as const;

export default async function TvPanelPage() {
  const now = new Date();
  const data = await new GetDashboardUseCase(getRepository()).execute(now);
  const orderById = new Map(data.orders.map((o) => [o.id, o]));
  const techById = new Map(data.technicians.map((t) => [t.id, t]));
  const critical = data.alerts.filter((a) => !a.resolved && (a.severity === "CRITICAL" || a.severity === "HIGH"));

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 lg:p-10">
      <AutoRefresh seconds={15} />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-4xl font-extrabold">
          PCP <span className="text-accent-ink">360°</span> <span className="text-2xl font-semibold text-muted">· Chão de oficina</span>
        </div>
        <div className="flex gap-6 text-xl">
          <span>Fila <b className="tabular-nums">{data.kpis.queueSize}</b></span>
          <span>Em execução <b className="tabular-nums">{data.kpis.inProgress}</b></span>
          <span>Boxes <b className="tabular-nums">{data.kpis.boxesOccupied}/{data.kpis.boxesTotal}</b></span>
          <span className="tabular-nums text-muted">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
          </span>
        </div>
      </header>

      <table className="w-full border-separate border-spacing-y-2 text-xl">
        <thead className="text-left text-sm uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4">Box</th><th className="px-4">OS</th><th className="px-4">Veículo</th>
            <th className="px-4">Mecânico</th><th className="px-4">Status</th><th className="px-4">Tempo restante</th><th className="px-4">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {data.boxes.map((box) => {
            const order = box.currentWorkOrderId ? orderById.get(box.currentWorkOrderId) : undefined;
            const remaining = order ? remainingHours(order, now) : null;
            return (
              <tr key={box.id} className="bg-surface">
                <td className={`rounded-l-xl border-l-8 px-4 py-3 text-3xl font-extrabold ${order ? ROW_BORDER[order.priority] : "border-line"}`}>{box.code}</td>
                {order ? (
                  <>
                    <td className="px-4 font-semibold">{order.osNumber}{order.planGold && <span className="ml-2 rounded bg-accent px-2 text-base font-bold text-black">OURO</span>}</td>
                    <td className="px-4">{order.plate ?? "—"}</td>
                    <td className="px-4">{order.assignedTechnicianId ? techById.get(order.assignedTechnicianId)?.name : "—"}</td>
                    <td className="px-4">{order.partsMissing ? <span className="font-bold text-p1">Aguardando peça</span> : STATUS_LABEL[order.status]}</td>
                    <td className={`px-4 font-bold tabular-nums ${remaining! < 0 ? "text-p1" : ""}`}>
                      {remaining! < 0 ? `+${formatHours(-remaining!)}` : formatHours(remaining)}
                    </td>
                    <td className="rounded-r-xl px-4"><PriorityBadge priority={order.priority} large /></td>
                  </>
                ) : (
                  <td colSpan={6} className={`rounded-r-xl px-4 font-semibold ${box.status === "MAINTENANCE" ? "text-muted" : "text-done"}`}>
                    {box.status === "MAINTENANCE" ? "Em manutenção" : "Livre"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-wider text-muted">Próximos da fila</h2>
          <ol className="flex flex-col gap-2 text-xl">
            {data.queue.slice(0, 5).map((q) => (
              <li key={q.order.id} className="flex items-center gap-3">
                <PriorityBadge priority={q.order.priority} />
                <span className="font-semibold">{q.order.osNumber}</span>
                <span className="text-muted">{q.order.plate}</span>
                <span className="ml-auto text-base text-muted">{q.suggestion?.technician.name ?? "—"} · {q.box?.code ?? "aguarda box"}</span>
              </li>
            ))}
            {!data.queue.length && <li className="text-muted">Fila vazia</li>}
          </ol>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-wider text-muted">Alertas</h2>
          <ul className="flex flex-col gap-2 text-xl">
            {critical.slice(0, 5).map((a) => (
              <li key={a.id} className={a.severity === "CRITICAL" ? "font-semibold text-p1" : "text-p2"}>{a.message}</li>
            ))}
            {!critical.length && <li className="text-done">Sem alertas críticos</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
