import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Chave secreta do servidor: formato novo (sb_secret_...) ou service_role legada. */
function serverKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serverKey());
}

/** Cliente do servidor (ignora RLS). Nunca importar em componentes de cliente. */
export function getServerSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverKey()!, {
      auth: { persistSession: false },
    });
  }
  return client;
}
