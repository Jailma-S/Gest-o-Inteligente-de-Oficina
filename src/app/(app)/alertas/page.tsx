import { resolveAlertAction } from "@/app/actions";
import { GenerateAlertsUseCase } from "@/application/use-cases/generate-alerts";
import { getRepository } from "@/infrastructure/container";
import { AutoRefresh } from "@/presentation/components/auto-refresh";
import { SeverityBadge } from "@/presentation/components/badges";
import { PageHeader } from "@/presentation/components/page-header";
import { OPERATION_CONFIG } from "@/shared/constants";
import { formatDateTime } from "@/shared/utils/time";

const TYPE_LABEL = {
  SLA_RISK: "SLA em risco",
  BOX_IDLE: "Box parado",
  GOLD_ARRIVED: "Plano Ouro chegou",
  PARTS_MISSING: "Peça indisponível",
} as const;

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };

export default async function AlertsPage() {
  const alerts = await new GenerateAlertsUseCase(getRepository()).execute();
  const open = alerts
    .filter((a) => !a.resolved)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const resolved = alerts.filter((a) => a.resolved).slice(0, 20);

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader
        title="Alertas preditivos"
        subtitle={`SLA em risco a partir de ${OPERATION_CONFIG.slaRiskThreshold * 100}% consumido · box parado após ${OPERATION_CONFIG.boxIdleMinutes} min sem atualização. Alertas de condição são resolvidos automaticamente quando a condição some.`}
      />

      <section className="card mb-6" aria-labelledby="abertos">
        <h2 id="abertos" className="border-b border-line p-4 font-bold">Abertos ({open.length})</h2>
        <ul className="divide-y divide-line">
          {open.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <SeverityBadge severity={a.severity} />
              <span className="w-36 text-xs font-semibold uppercase text-muted">{TYPE_LABEL[a.type]}</span>
              <span className="flex-1">{a.message}</span>
              <span className="text-xs text-muted">{formatDateTime(a.createdAt)}</span>
              <form action={resolveAlertAction}>
                <input type="hidden" name="id" value={a.id} />
                <button className="btn py-1 text-xs">Resolver</button>
              </form>
            </li>
          ))}
          {!open.length && <li className="p-4 text-sm text-muted">Nenhum alerta aberto.</li>}
        </ul>
      </section>

      <section className="card" aria-labelledby="resolvidos">
        <h2 id="resolvidos" className="border-b border-line p-4 font-bold">Resolvidos recentemente</h2>
        <ul className="divide-y divide-line text-sm text-muted">
          {resolved.map((a) => (
            <li key={a.id} className="flex gap-3 p-3">
              <span className="w-36 text-xs uppercase">{TYPE_LABEL[a.type]}</span>
              <span className="flex-1">{a.message}</span>
              <span className="text-xs">{formatDateTime(a.createdAt)}</span>
            </li>
          ))}
          {!resolved.length && <li className="p-4">—</li>}
        </ul>
      </section>
    </>
  );
}
