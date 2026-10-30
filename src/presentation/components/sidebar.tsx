"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/os", label: "Ordens de Serviço" },
  { href: "/boxes", label: "Boxes" },
  { href: "/mecanicos", label: "Mecânicos" },
  { href: "/analytics", label: "Analytics" },
  { href: "/alertas", label: "Alertas" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Sidebar({ mode, openAlerts }: { mode: "demo" | "supabase"; openAlerts: number }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-col gap-1 border-b border-line bg-surface p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="mb-4">
        <div className="text-xl font-extrabold tracking-tight">
          PCP <span className="text-accent-ink">360°</span>
        </div>
        <div className="text-xs text-muted">Gestão Inteligente de Oficina</div>
      </div>
      <nav className="flex flex-wrap gap-1 md:flex-col" aria-label="Principal">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {l.label}
              {l.href === "/alertas" && openAlerts > 0 && (
                <span className="rounded-full bg-p1 px-2 text-xs font-bold text-white">{openAlerts}</span>
              )}
            </Link>
          );
        })}
        <Link
          href="/tv"
          className="mt-2 rounded-lg border border-accent-ink px-3 py-2 text-center text-sm font-bold text-accent-ink md:mt-4"
        >
          Painel TV ↗
        </Link>
      </nav>
      <div className="mt-auto hidden pt-4 text-xs text-muted md:block">
        Dados: {mode === "demo" ? "modo demo (memória)" : "Supabase"}
      </div>
    </aside>
  );
}
