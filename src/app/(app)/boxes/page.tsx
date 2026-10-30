import { setBoxStatusAction } from "@/app/actions";
import { getRepository } from "@/infrastructure/container";
import { BoxCard } from "@/presentation/components/box-card";
import { PageHeader } from "@/presentation/components/page-header";
import { BoxForm } from "@/presentation/components/registry-forms";

export default async function BoxesPage() {
  const now = new Date();
  const repo = getRepository();
  const [boxes, orders, technicians] = await Promise.all([repo.listBoxes(), repo.listWorkOrders(), repo.listTechnicians()]);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const techById = new Map(technicians.map((t) => [t.id, t]));
  const sorted = boxes.sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <PageHeader
        title="Boxes"
        subtitle={`${boxes.filter((b) => b.status === "OCCUPIED").length} ocupados · ${boxes.filter((b) => b.status === "AVAILABLE").length} livres · ${boxes.filter((b) => b.status === "MAINTENANCE").length} em manutenção`}
      />
      <div className="mb-6"><BoxForm /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((box) => {
          const order = box.currentWorkOrderId ? orderById.get(box.currentWorkOrderId) : undefined;
          return (
            <BoxCard
              key={box.id}
              box={box}
              order={order}
              technician={order?.assignedTechnicianId ? techById.get(order.assignedTechnicianId) : undefined}
              now={now}
            >
              {box.status !== "OCCUPIED" && (
                <form action={setBoxStatusAction}>
                  <input type="hidden" name="id" value={box.id} />
                  <input type="hidden" name="status" value={box.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE"} />
                  <button className="btn w-full justify-center">
                    {box.status === "MAINTENANCE" ? "Liberar box" : "Colocar em manutenção"}
                  </button>
                </form>
              )}
            </BoxCard>
          );
        })}
      </div>
    </>
  );
}
