import Link from "next/link";
import { CSV_COLUMNS } from "@/application/use-cases/import-os";
import { getRepository } from "@/infrastructure/container";
import { ImportForm } from "@/presentation/components/import-form";
import { PageHeader } from "@/presentation/components/page-header";

export default async function ImportPage() {
  const skills = await getRepository().listSkills();
  return (
    <>
      <Link href="/os" className="mb-3 inline-block text-sm text-muted hover:text-ink">← Ordens de Serviço</Link>
      <PageHeader title="Importar OS" subtitle="Upload em lote via CSV, com validação automática e classificação P1/P2/P3." />

      <ImportForm />

      <section className="card mt-6 p-4 text-sm leading-relaxed" aria-labelledby="formato">
        <h2 id="formato" className="mb-2 font-bold">Formato do arquivo</h2>
        <p className="text-muted">
          Separador <code>;</code> ou <code>,</code>. Primeira linha com os nomes das colunas.{" "}
          <a href="/exemplo-os.csv" download className="text-accent underline">Baixar exemplo</a>.
        </p>
        <p className="mt-2"><code className="break-all text-xs">{CSV_COLUMNS.join(";")}</code></p>
        <ul className="mt-3 list-disc pl-5 text-muted">
          <li>Obrigatórias: <b>os_number</b>, <b>service_type</b>, <b>estimated_hours</b>.</li>
          <li>service_type: Revisão, Preventiva, Corretiva, Diagnóstico, Diagnóstico Complexo.</li>
          <li>plan_gold, sensitive_cargo, parts_missing: Sim/Não (ou 1/0).</li>
          <li>promised_date: dd/mm/aaaa hh:mm ou ISO (2026-10-30T18:00).</li>
          <li>required_skill: {skills.map((s) => s.name).join(", ")}.</li>
          <li>OS já existentes são ignoradas (sem duplicar).</li>
        </ul>
      </section>
    </>
  );
}
