import { resetDemoAction } from "@/app/actions";
import { dataMode } from "@/infrastructure/container";
import { PageHeader } from "@/presentation/components/page-header";
import { MATCHING_WEIGHTS, OPERATION_CONFIG } from "@/shared/constants";

export default function SettingsPage() {
  const mode = dataMode();
  const rows: [string, string][] = [
    ["Peso SLA no matching", `${MATCHING_WEIGHTS.sla * 100}%`],
    ["Peso disponibilidade", `${MATCHING_WEIGHTS.availability * 100}%`],
    ["Peso skill match", `${MATCHING_WEIGHTS.skill * 100}%`],
    ["Peso certificação", `${MATCHING_WEIGHTS.certification * 100}%`],
    ["Peso produtividade", `${MATCHING_WEIGHTS.productivity * 100}%`],
    ["Folga para SLA próximo (vira P2)", `${OPERATION_CONFIG.slaNearSlackHours}h além das horas estimadas`],
    ["Alerta SLA em risco", `${OPERATION_CONFIG.slaRiskThreshold * 100}% consumido`],
    ["Alerta box parado", `${OPERATION_CONFIG.boxIdleMinutes} min sem atualização`],
    ["Turno", `${OPERATION_CONFIG.shiftStartHour}h, ${OPERATION_CONFIG.shiftHours}h de duração`],
  ];

  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros do motor de priorização, matching e alertas." />

      <section className="card mb-6" aria-labelledby="parametros">
        <h2 id="parametros" className="border-b border-line p-4 font-bold">Parâmetros</h2>
        <table className="table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><td className="text-muted">{k}</td><td className="font-semibold">{v}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="p-4 text-xs text-muted">Nesta versão os parâmetros são definidos em <code>src/shared/constants</code>. Edição pela tela fica para a próxima fase.</p>
      </section>

      <section className="card p-4" aria-labelledby="dados">
        <h2 id="dados" className="mb-2 font-bold">Fonte de dados</h2>
        {mode === "demo" ? (
          <>
            <p className="text-sm text-muted">
              Modo demo: dados fictícios em memória, reiniciados quando o servidor reinicia. Para usar o Supabase, preencha as
              variáveis do arquivo <code>.env.local</code> (veja o README).
            </p>
            <form action={resetDemoAction} className="mt-3">
              <button className="btn">Reiniciar dados de demonstração</button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted">Conectado ao Supabase.</p>
        )}
      </section>
    </>
  );
}
