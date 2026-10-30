import type { Technician, WorkOrder, WorkshopBox } from "@/domain/entities";
import { OPERATION_CONFIG } from "@/shared/constants";
import { average, hoursBetween } from "@/shared/utils/time";

export interface Kpis {
  /** Médias em horas, sobre OS concluídas nos últimos 7 dias. */
  leadTime: number | null;
  touchTime: number | null;
  waitingTime: number | null;
  /** 0 a 1. */
  firstTimeRight: number | null;
  goldAdherence: number | null;
  /** OS concluídas por box por dia (média 7 dias). */
  boxProductivity: number | null;
  /** Horas produtivas hoje / horas disponíveis hoje (0 a 1). */
  technicianUtilization: number | null;
  doneLast7Days: number;
  queueSize: number;
  inProgress: number;
  boxesOccupied: number;
  boxesTotal: number;
}

const DAY_MS = 86_400_000;

function shiftStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(OPERATION_CONFIG.shiftStartHour, 0, 0, 0);
  return start;
}

function overlapHours(from: Date, to: Date, windowStart: Date, windowEnd: Date): number {
  const start = from > windowStart ? from : windowStart;
  const end = to < windowEnd ? to : windowEnd;
  return Math.max(0, hoursBetween(start, end));
}

export function computeKpis(
  orders: WorkOrder[],
  boxes: WorkshopBox[],
  technicians: Technician[],
  now: Date,
): Kpis {
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const done = orders.filter((o) => o.status === "DONE" && o.finishedAt && o.finishedAt >= since);

  const lead = done.map((o) => hoursBetween(o.arrivedAt, o.finishedAt!));
  const touch = done.filter((o) => o.startedAt).map((o) => hoursBetween(o.startedAt!, o.finishedAt!));
  const waiting = orders
    .filter((o) => o.startedAt && o.startedAt >= since)
    .map((o) => hoursBetween(o.arrivedAt, o.startedAt!));

  const gold = done.filter((o) => o.planGold && o.promisedDate);
  const goldOnTime = gold.filter((o) => o.finishedAt! <= o.promisedDate!);

  const activeBoxes = boxes.filter((b) => b.status !== "MAINTENANCE").length;

  const start = shiftStart(now);
  const elapsedShift = Math.min(OPERATION_CONFIG.shiftHours, Math.max(0, hoursBetween(start, now)));
  const availableTechs = technicians.filter((t) => t.active && t.available).length;
  const productiveToday = orders
    .filter((o) => o.startedAt && o.status !== "PAUSED")
    .reduce((sum, o) => sum + overlapHours(o.startedAt!, o.finishedAt ?? now, start, now), 0);
  const availableHours = availableTechs * elapsedShift;

  return {
    leadTime: average(lead),
    touchTime: average(touch),
    waitingTime: average(waiting),
    firstTimeRight: done.length ? done.filter((o) => !o.rework).length / done.length : null,
    goldAdherence: gold.length ? goldOnTime.length / gold.length : null,
    boxProductivity: activeBoxes ? done.length / 7 / activeBoxes : null,
    technicianUtilization: availableHours > 0 ? Math.min(1, productiveToday / availableHours) : null,
    doneLast7Days: done.length,
    queueSize: orders.filter((o) => o.status === "WAITING").length,
    inProgress: orders.filter((o) => o.status === "IN_PROGRESS").length,
    boxesOccupied: boxes.filter((b) => b.status === "OCCUPIED").length,
    boxesTotal: boxes.length,
  };
}
