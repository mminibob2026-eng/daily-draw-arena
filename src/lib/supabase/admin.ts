import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin / service-role Supabase client.
 * Only use this in server-side contexts that must bypass RLS
 * (e.g. cron jobs, deterministic challenge generation).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase service role configuration')
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
