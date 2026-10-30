"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a tela periodicamente. Com Supabase, substituir por assinatura Realtime. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
