import type { WorkshopRepository } from "@/domain/repositories";
import { MemoryWorkshopRepository } from "./repositories/memory-repository";
import { SupabaseWorkshopRepository } from "./repositories/supabase-repository";
import { getServerSupabase, isSupabaseConfigured } from "./supabase/client";

export type DataMode = "supabase" | "demo";

export function dataMode(): DataMode {
  return isSupabaseConfigured() ? "supabase" : "demo";
}

/** Sem variáveis do Supabase o sistema roda em modo demo, com dados em memória. */
export function getRepository(): WorkshopRepository {
  return dataMode() === "supabase"
    ? new SupabaseWorkshopRepository(getServerSupabase())
    : new MemoryWorkshopRepository();
}
