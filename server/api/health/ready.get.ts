import { hasSupabaseConfig, getServerSupabase } from '../../utils/supabase'
import { getCareGuideConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const config = getCareGuideConfig(event)
  const production = !import.meta.dev && !config.public.demoMode
  const checks = { openai: Boolean(config.openaiApiKey), supabase: false, session: Boolean(config.sessionSecret), worker: true }

  if (hasSupabaseConfig(event)) {
    const client = getServerSupabase(event)
    const { error } = await client.rpc('careguide_healthcheck')
    checks.supabase = !error
    if (config.supabaseSecretKey) {
      const { data: heartbeat } = await client.from('worker_heartbeats').select('heartbeat_at').order('heartbeat_at', { ascending: false }).limit(1).maybeSingle()
      checks.worker = Boolean(heartbeat && Date.now() - new Date(heartbeat.heartbeat_at).getTime() < 90_000)
    } else if (production) checks.worker = false
  }

  const ready = production ? Object.values(checks).every(Boolean) : true
  if (!ready) setResponseStatus(event, 503)
  return { status: ready ? 'ready' : 'not-ready', mode: production ? 'production' : 'demo', checks, timestamp: new Date().toISOString() }
})
