"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importOsAction } from "@/app/actions";
import type { ImportResult } from "@/application/dto";

export function ImportForm() {
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(importOsAction, null);

  return (
    <section className="card p-4" aria-labelledby="upload">
      <h2 id="upload" className="mb-3 font-bold">Arquivo CSV</h2>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".csv,text/csv" required className="input" aria-label="Arquivo CSV" />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Importando…" : "Importar"}</button>
      </form>

      {result && (
        <div className="mt-4 flex flex-col gap-2 text-sm" role="status">
          {result.imported > 0 && (
            <p className="font-semibold text-done">
              {result.imported} OS importada(s) e priorizada(s).{" "}
              <Link href="/os" className="underline">Ver fila</Link>
            </p>
          )}
          {result.duplicates.length > 0 && (
            <p className="text-p2">Ignoradas por já existirem: {result.duplicates.join(", ")}</p>
          )}
          {result.errors.length > 0 && (
            <div>
              <p className="font-semibold text-p1">{result.errors.length} linha(s) com erro:</p>
              <ul className="mt-1 list-disc pl-5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e.line > 0 ? `Linha ${e.line}: ` : ""}{e.message}</li>
                ))}
              </ul>
            </div>
          )}
          {result.imported === 0 && !result.errors.length && !result.duplicates.length && <p>Nada a importar.</p>}
        </div>
      )}
    </section>
  );
}
