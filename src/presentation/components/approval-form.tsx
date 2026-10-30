"use client";

import { useActionState } from "react";
import { approveAllocationAction, type ActionState } from "@/app/actions";

interface Option {
  id: string;
  label: string;
}

export function ApprovalForm({ orderId, candidates, boxes }: { orderId: string; candidates: Option[]; boxes: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(approveAllocationAction, null);
  const blocked = !candidates.length || !boxes.length;

  return (
    <section className="card p-4" aria-labelledby="aprovar">
      <h2 id="aprovar" className="mb-3 font-bold">Aprovação do supervisor</h2>
      {blocked ? (
        <p className="text-sm text-p2">
          {!candidates.length ? "Nenhum mecânico elegível." : "Nenhum box compatível livre."} A OS permanece na fila.
        </p>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="orderId" value={orderId} />
          <label className="flex flex-col gap-1 text-sm">
            Mecânico
            <select name="technicianId" className="input" defaultValue={candidates[0].id}>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Box
            <select name="boxId" className="input" defaultValue={boxes[0].id}>
              {boxes.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Alocando…" : "Aprovar alocação"}
          </button>
        </form>
      )}
      {state?.error && <p role="alert" className="mt-3 text-sm font-semibold text-p1">{state.error}</p>}
    </section>
  );
}
