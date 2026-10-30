import Link from "next/link";
import type { QueuePlanItem } from "@/application/dto";
import { slaConsumption } from "@/domain/value-objects/sla";
import { SERVICE_LABEL } from "@/shared/constants";
import { formatDateTime } from "@/shared/utils/time";
import { GoldTag, PriorityBadge } from "./badges";

export function QueueTable({ items, now }: { items: QueuePlanItem[]; now: Date }) {
  if (!items.length) {
    return <p className="p-4 text-sm text-muted">Fila vazia. Importe OS para começar.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Prior.</th>
            <th>OS</th>
            <th>Serviço</th>
            <th>Prazo</th>
            <th>SLA</th>
            <th>Sugestão IA</th>
            <th>Box</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ position, order, suggestion, box }) => {
            const sla = slaConsumption(order, now);
            return (
              <tr key={order.id}>
                <td className="tabular-nums text-muted">{position}</td>
                <td>
                  <PriorityBadge priority={order.priority} />
                </td>
                <td>
                  <Link href={`/os/${order.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {order.osNumber}
                  </Link>
                  {order.planGold && <GoldTag />}
                  <div className="text-xs text-muted">{order.plate ?? "—"} · {order.customerName ?? "—"}</div>
                </td>
                <td>
                  {SERVICE_LABEL[order.serviceType]}
                  <div className="text-xs text-muted">{order.priorityReason}</div>
                </td>
                <td className="whitespace-nowrap">{formatDateTime(order.promisedDate)}</td>
                <td className={`tabular-nums font-semibold ${sla !== null && sla >= 0.8 ? "text-p1" : "text-muted"}`}>
                  {sla === null ? "—" : `${Math.round(sla * 100)}%`}
                </td>
                <td>
                  {suggestion ? (
                    <>
                      <span className="font-semibold">{suggestion.technician.name}</span>
                      <span className="ml-2 rounded bg-surface-2 px-1.5 text-xs tabular-nums">{suggestion.score.toFixed(0)}</span>
                    </>
                  ) : (
                    <span className="text-p2">Sem mecânico elegível</span>
                  )}
                </td>
                <td>{box ? box.code : <span className="text-p2">Aguarda box</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
