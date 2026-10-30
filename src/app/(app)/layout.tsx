import { dataMode, getRepository } from "@/infrastructure/container";
import { Sidebar } from "@/presentation/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const openAlerts = (await getRepository().listAlerts()).filter((a) => !a.resolved).length;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar mode={dataMode()} openAlerts={openAlerts} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
