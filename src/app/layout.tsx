import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PCP 360° · Gestão Inteligente de Oficina",
  description: "Torre de controle operacional: OS, boxes, mecânicos e alertas em tempo real.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
