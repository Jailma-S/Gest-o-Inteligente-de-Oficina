import { toggleTechnicianAction } from "@/app/actions";
import { technicianFreeAt } from "@/domain/rules/matching";
import { getRepository } from "@/infrastructure/container";
import { PageHeader } from "@/presentation/components/page-header";
import { TechnicianForm } from "@/presentation/components/registry-forms";
import { LEVEL_LABEL } from "@/shared/constants";
import { formatHours, hoursBetween } from "@/shared/utils/time";

export default async function TechniciansPage() {
  const now = new Date();
  const repo = getRepository();
  const [technicians, skills, orders] = await Promise.all([repo.listTechnicians(), repo.listSkills(), repo.listWorkOrders()]);
  const freeAt = technicianFreeAt(orders, now);
  const levelOrder = { SR: 0, PLENO: 1, JR: 2, ASSISTENTE: 3 };
  const sorted = technicians.sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Mecânicos e matriz de skills"
        subtitle={`${technicians.filter((t) => t.active && t.available).length} disponíveis no turno de ${technicians.filter((t) => t.active).length} ativos`}
      />

      <section className="card mb-6" aria-labelledby="matriz">
        <h2 id="matriz" className="border-b border-line p-4 font-bold">Matriz de competências</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Mecânico</th>
                <th>Nível</th>
                <th>Produt.</th>
                <th>Carteira</th>
                {skills.map((s) => <th key={s.id} className="text-center">{s.name}</th>)}
                <th>Turno</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const until = freeAt.get(t.id);
                const load = until ? Math.max(0, hoursBetween(now, until)) : 0;
                return (
                  <tr key={t.id} className={t.active ? "" : "opacity-50"}>
                    <td className="font-semibold">{t.name}</td>
                    <td>{LEVEL_LABEL[t.level]}</td>
                    <td className="tabular-nums">{t.productivityScore}</td>
                    <td className={`tabular-nums ${load > 8 ? "font-bold text-p1" : ""}`}>{load ? formatHours(load) : "Livre"}</td>
                    {skills.map((s) => {
                      const own = t.skills.find((x) => x.skillId === s.id);
                      return (
                        <td key={s.id} className="text-center tabular-nums">
                          {own ? (
                            <span title={own.certified ? "Certificado" : undefined} className={own.proficiency >= 4 ? "font-bold" : "text-muted"}>
                              {own.proficiency}{own.certified && <span className="text-accent-ink">★</span>}
                            </span>
                          ) : (
                            <span className="text-line">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <form action={toggleTechnicianAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="field" value="available" />
                        <button
                          className={`btn py-1 text-xs ${t.available ? "border-done text-done" : "text-muted"}`}
                          aria-pressed={t.available}
                        >
                          {t.available ? "Disponível" : "Ausente"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="p-4 text-xs text-muted">Proficiência 1–5 · ★ certificado. Clique em Disponível/Ausente para marcar presença no turno.</p>
      </section>

      <h2 className="mb-3 font-bold">Cadastrar mecânico</h2>
      <TechnicianForm skills={skills} />
    </>
  );
}
