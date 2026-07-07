import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { getCareGuideConfig } from './config'

export function hasSupabaseConfig(event: H3Event): boolean {
  const config = getCareGuideConfig(event)
  return Boolean(config.public.supabase.url && (config.supabaseSecretKey || config.public.supabase.key))
}

export function hasSupabaseServiceConfig(event: H3Event): boolean {
  const config = getCareGuideConfig(event)
  return Boolean(config.public.supabase.url && config.supabaseSecretKey)
}

export function getServerSupabase(event: H3Event): SupabaseClient {
  const config = getCareGuideConfig(event)
  const url = config.public.supabase.url
  const key = config.supabaseSecretKey || config.public.supabase.key
  if (!url || !key) throw createError({ statusCode: 503, statusMessage: 'Supabase is not configured' })
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'careguide-nitro/1.0' } },
  })
}
