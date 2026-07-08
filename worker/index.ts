import { createServer } from 'node:http'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.NUXT_SUPABASE_SECRET_KEY
const workerId = process.env.WORKER_ID || `careguide-worker-${process.pid}`
const healthPort = Number(process.env.WORKER_HEALTH_PORT || 3001)
const pollMs = Number(process.env.WORKER_POLL_MS || 2500)

let healthy = false
let stopping = false
let lastHeartbeat: string | null = null

if (!url || !key) {
  console.error(JSON.stringify({ level: 'error', event: 'worker_config_missing' }))
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const healthServer = createServer((_request, response) => {
  response.statusCode = healthy ? 200 : 503
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({ status: healthy ? 'ok' : 'starting', workerId, lastHeartbeat }))
})

healthServer.listen(healthPort, '127.0.0.1')

async function heartbeat(): Promise<void> {
  const { error } = await supabase.rpc('record_worker_heartbeat', { p_worker_id: workerId })
  if (error) throw error
  lastHeartbeat = new Date().toISOString()
  healthy = true
}

async function processBatch(): Promise<void> {
  const { data, error } = await supabase.rpc('claim_domain_events', { p_worker_id: workerId, p_limit: 20 })
  if (error) throw error
  for (const event of data ?? []) {
    try {
      console.log(JSON.stringify({ level: 'info', event: 'domain_event_processed', eventId: event.id, eventType: event.event_type }))
      await supabase.rpc('complete_domain_event', { p_event_id: event.id, p_worker_id: workerId })
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : 'Unknown worker error'
      await supabase.rpc('fail_domain_event', { p_event_id: event.id, p_worker_id: workerId, p_error: message.slice(0, 500) })
    }
  }
  await supabase.rpc('cleanup_careguide_data')
  await supabase.rpc('purge_expired_login_events')
}

async function run(): Promise<void> {
  while (!stopping) {
    try {
      await heartbeat()
      await processBatch()
    } catch (error) {
      healthy = false
      console.error(JSON.stringify({ level: 'error', event: 'worker_loop_failed', message: error instanceof Error ? error.message : 'Unknown error' }))
    }
    await new Promise(resolve => setTimeout(resolve, pollMs))
  }
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return
  stopping = true
  healthy = false
  console.log(JSON.stringify({ level: 'info', event: 'worker_shutdown', signal }))
  await new Promise<void>(resolve => healthServer.close(() => resolve()))
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

void run()
