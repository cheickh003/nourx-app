import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Crée un client Supabase avec la Service Role Key (bypass RLS).
 * À n'utiliser que côté serveur (webhooks, tâches CRON, etc.).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('SUPABASE admin non configuré: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'nourx-app/admin',
      },
    },
  })
}


