"use client";

import { useActionState } from "react";
import { saveBoxAction, saveTechnicianAction, type ActionState } from "@/app/actions";
import type { Skill } from "@/domain/entities";
import { BOX_CATEGORY_LABEL, LEVEL_LABEL } from "@/shared/constants";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm font-semibold ${state.error ? "text-p1" : "text-done"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function BoxForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBoxAction, null);
  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1 text-sm">
        Código
        <input name="code" required maxLength={10} placeholder="B09" className="input w-28" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select name="category" className="input">
          {Object.entries(BOX_CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <button className="btn btn-primary" disabled={pending}>Cadastrar box</button>
      <Feedback state={state} />
    </form>
  );
}

export function TechnicianForm({ skills }: { skills: Skill[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTechnicianAction, null);
  return (
    <form action={action} className="card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input name="name" required className="input w-56" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nível
          <select name="level" className="input" defaultValue="PLENO">
            {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Produtividade (0–100)
          <input name="productivity" type="number" min={0} max={100} defaultValue={75} className="input w-28" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="available" type="checkbox" defaultChecked /> Disponível no turno
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Matriz de skills (0 = não possui · 5 = referência)</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
              <span className="flex-1">{s.name}</span>
              <select name={`prof_${s.id}`} className="input py-1" aria-label={`Proficiência em ${s.name}`} defaultValue="0">
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name={`cert_${s.id}`} /> Cert.
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>Cadastrar mecânico</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
