import { computeKpis } from "@/domain/rules/kpis";
import { getRepository } from "@/infrastructure/container";
import { KpiTile, formatPct } from "@/presentation/components/kpi-tile";
import { PageHeader } from "@/presentation/components/page-header";
import { LEVEL_LABEL, SERVICE_LABEL } from "@/shared/constants";
import { average, formatHours, hoursBetween } from "@/shared/utils/time";

const DAY_MS = 86_400_000;

function Bar({ value, max, color = "bg-p3" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-surface-2" aria-hidden>
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  const now = new Date();
  const repo = getRepository();
  const [orders, boxes, technicians] = await Promise.all([repo.listWorkOrders(), repo.listBoxes(), repo.listTechnicians()]);
  const kpis = computeKpis(orders, boxes, technicians, now);
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const done = orders.filter((o) => o.status === "DONE" && o.finishedAt && o.finishedAt >= since);

  const perBox = boxes
    .map((b) => ({ code: b.code, count: done.filter((o) => o.assignedBoxId === b.id).length }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const maxBox = Math.max(1, ...perBox.map((b) => b.count));

  const perTech = technicians
    .filter((t) => t.active)
    .map((t) => {
      const mine = done.filter((o) => o.assignedTechnicianId === t.id);
      const touch = mine.filter((o) => o.startedAt).reduce((s, o) => s + hoursBetween(o.startedAt!, o.finishedAt!), 0);
      return { t, count: mine.length, touch, rework: mine.filter((o) => o.rework).length };
    })
    .sort((a, b) => b.touch - a.touch);
  const maxTouch = Math.max(1, ...perTech.map((x) => x.touch));

  const perService = (Object.keys(SERVICE_LABEL) as (keyof typeof SERVICE_LABEL)[]).map((s) => {
    const mine = done.filter((o) => o.serviceType === s);
    return {
      s,
      count: mine.length,
      lead: average(mine.map((o) => hoursBetween(o.arrivedAt, o.finishedAt!))),
      estVsReal: average(mine.filter((o) => o.startedAt).map((o) => hoursBetween(o.startedAt!, o.finishedAt!) / o.estimatedHours)),
    };
  });

  return (
    <>
      <PageHeader title="Analytics" subtitle="Últimos 7 dias, OS concluídas." />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
        <KpiTile label="Lead Time" value={formatHours(kpis.leadTime)} hint="Chegada → entrega" />
        <KpiTile label="Touch Time" value={formatHours(kpis.touchTime)} hint="Tempo efetivo" />
        <KpiTile label="Waiting Time" value={formatHours(kpis.waitingTime)} hint="Chegada → início" />
        <KpiTile
          label="Eficiência de fluxo"
          value={kpis.leadTime && kpis.touchTime ? formatPct(kpis.touchTime / kpis.leadTime) : "—"}
          hint="Touch / Lead (Lean)"
        />
        <KpiTile label="First Time Right" value={formatPct(kpis.firstTimeRight)} />
        <KpiTile label="Aderência Plano Ouro" value={formatPct(kpis.goldAdherence)} hint="Meta 100%" />
        <KpiTile label="Produtividade por box" value={kpis.boxProductivity?.toFixed(2) ?? "—"} hint="OS concluídas / box / dia" />
        <KpiTile label="OS concluídas" value={String(kpis.doneLast7Days)} hint="7 dias" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-4" aria-labelledby="porbox">
          <h2 id="porbox" className="mb-3 font-bold">OS concluídas por box</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {perBox.map((b) => (
              <li key={b.code} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-3">
                <span className="font-semibold">{b.code}</span>
                <Bar value={b.count} max={maxBox} />
                <span className="text-right tabular-nums">{b.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4" aria-labelledby="portec">
          <h2 id="portec" className="mb-3 font-bold">Horas produtivas por mecânico</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {perTech.map(({ t, count, touch, rework }) => (
              <li key={t.id} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-3">
                <span className="truncate font-semibold" title={`${t.name} · ${LEVEL_LABEL[t.level]}`}>{t.name}</span>
                <Bar value={touch} max={maxTouch} color="bg-done" />
                <span className="text-right text-xs tabular-nums text-muted">
                  {formatHours(touch)} · {count} OS{rework ? <span className="text-p1"> · {rework} RT</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card xl:col-span-2" aria-labelledby="porservico">
          <h2 id="porservico" className="border-b border-line p-4 font-bold">Por tipo de serviço</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Serviço</th><th>OS</th><th>Lead Time médio</th><th>Real ÷ estimado</th></tr></thead>
              <tbody>
                {perService.map((r) => (
                  <tr key={r.s}>
                    <td>{SERVICE_LABEL[r.s]}</td>
                    <td className="tabular-nums">{r.count}</td>
                    <td className="tabular-nums">{formatHours(r.lead)}</td>
                    <td className={`tabular-nums ${r.estVsReal && r.estVsReal > 1.1 ? "text-p2" : ""}`}>
                      {r.estVsReal ? `${r.estVsReal.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
