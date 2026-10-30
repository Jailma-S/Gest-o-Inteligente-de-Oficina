import type { Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import { BOX_CATEGORY_LABEL, BOX_STATUS_LABEL } from "@/shared/constants";
import { addHours, formatHours, hoursBetween } from "@/shared/utils/time";
import { PriorityBadge, StatusBadge } from "./badges";

export function remainingHours(order: WorkOrder, now: Date): number {
  const start = order.startedAt ?? now;
  return hoursBetween(now, addHours(start, order.estimatedHours));
}

export function BoxCard({
  box,
  order,
  technician,
  now,
  children,
}: {
  box: WorkshopBox;
  order?: WorkOrder;
  technician?: Technician;
  now: Date;
  children?: React.ReactNode;
}) {
  const border = order ? { P1: "border-p1", P2: "border-p2", P3: "border-p3" }[order.priority] : box.status === "MAINTENANCE" ? "border-muted" : "border-done";
  const remaining = order ? remainingHours(order, now) : null;
  return (
    <div className={`card border-l-4 ${border} flex flex-col gap-2 p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold">{box.code}</div>
        <div className="text-xs text-muted">{BOX_CATEGORY_LABEL[box.category]}</div>
      </div>
      {order ? (
        <>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={order.priority} />
            <span className="font-semibold">{order.osNumber}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-sm text-muted">
            {order.plate ?? "—"} · {technician?.name ?? "—"}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${remaining !== null && remaining < 0 ? "text-p1" : ""}`}>
            {remaining !== null && remaining < 0 ? `Excedido ${formatHours(-remaining)}` : `Restante ${formatHours(remaining)}`}
          </div>
        </>
      ) : (
        <div className={`text-sm font-semibold ${box.status === "MAINTENANCE" ? "text-muted" : "text-done"}`}>
          {BOX_STATUS_LABEL[box.status]}
        </div>
      )}
      {children}
    </div>
  );
}
