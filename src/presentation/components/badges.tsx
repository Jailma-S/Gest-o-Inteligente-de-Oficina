import type { AlertSeverity, PriorityLevel, WorkOrderStatus } from "@/domain/entities";
import { PRIORITY_META, SEVERITY_LABEL, STATUS_LABEL } from "@/shared/constants";

// Texto escuro sobre fundo colorido: garante contraste WCAG AA (≥ 4.5:1) com as cores da especificação.

const PRIORITY_BG: Record<PriorityLevel, string> = { P1: "bg-p1", P2: "bg-p2", P3: "bg-p3" };

export function PriorityBadge({ priority, large = false }: { priority: PriorityLevel; large?: boolean }) {
  return (
    <span
      className={`${PRIORITY_BG[priority]} inline-block rounded-md font-bold text-black ${large ? "px-3 py-1 text-xl" : "px-2 py-0.5 text-xs"}`}
      title={PRIORITY_META[priority].label}
    >
      {priority}
    </span>
  );
}

const STATUS_STYLE: Record<WorkOrderStatus, string> = {
  WAITING: "border-muted text-muted",
  ASSIGNED: "border-p3 text-[#93c5fd]",
  IN_PROGRESS: "border-accent text-accent",
  PAUSED: "border-p2 text-p2",
  DONE: "border-done text-done",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  CRITICAL: "bg-p1 text-black",
  HIGH: "bg-p2 text-black",
  MEDIUM: "bg-[#fde68a] text-black",
  INFO: "bg-p3 text-black",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${SEVERITY_STYLE[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function GoldTag() {
  return (
    <span className="ml-1 inline-block rounded bg-accent px-1.5 text-[10px] font-bold text-black" title="Plano Ouro">
      OURO
    </span>
  );
}
