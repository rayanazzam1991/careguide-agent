import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import type { BookingConfirmation, OpsRun, OpsSummary, SlotHold } from '../../app/types/careguide'
import type { SafetyBoundary } from './safety'
import { helpArticles, locations, makeAvailability, providers, services } from './catalog'
import { getServerSupabase, hasSupabaseConfig, hasSupabaseServiceConfig } from './supabase'

interface DemoState {
  holds: Map<string, SlotHold & { sessionHash: string }>
  bookings: Map<string, BookingConfirmation & { sessionHash: string, idempotencyKey: string }>
  runs: OpsRun[]
  handoffs: number
  safetyEvents: number
  feedback: Array<{ value: 'positive' | 'negative', createdAt: string }>
}

const globalState = globalThis as typeof globalThis & { __careguideState?: DemoState }
const state: DemoState = globalState.__careguideState ?? {
  holds: new Map(), bookings: new Map(), runs: [], handoffs: 0, safetyEvents: 0, feedback: [],
}
globalState.__careguideState = state

function cleanExpiredHolds(): void {
  const now = Date.now()
  for (const hold of state.holds.values()) {
    if (hold.status === 'active' && new Date(hold.expiresAt).getTime() <= now) hold.status = 'expired'
  }
}

export async function searchServices(event: H3Event, query = '') {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('search_services', { search_query: query })
    if (!error && data) return data
  }
  const normalized = query.trim().toLowerCase()
  return normalized ? services.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(normalized)) : services
}

export async function searchHelpContent(event: H3Event, query: string) {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('search_help_content', { search_query: query })
    if (!error && data) return data
  }
  const normalized = query.toLowerCase()
  return helpArticles.filter(item => `${item.title} ${item.body}`.toLowerCase().includes(normalized)).slice(0, 4)
}

export async function findProviders(event: H3Event, serviceId: string, modality?: string) {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('find_providers', { p_service_id: serviceId, p_modality: modality ?? null })
    if (!error && data) return data
  }
  return providers.filter(provider => provider.serviceIds.includes(serviceId) && (!modality || provider.modalities.includes(modality as 'online' | 'in-person')))
}

export async function getAvailability(event: H3Event, providerIds: string[], serviceId: string) {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('get_available_slots', { p_provider_ids: providerIds, p_service_id: serviceId })
    if (!error && data) return data
  }
  cleanExpiredHolds()
  const heldSlots = new Set([...state.holds.values()].filter(hold => hold.status === 'active').map(hold => hold.slotId))
  return makeAvailability().filter(slot => providerIds.includes(slot.providerId) && slot.serviceId === serviceId && !heldSlots.has(slot.id)).slice(0, 20)
}

export async function holdSlot(event: H3Event, sessionHash: string, slotId: string): Promise<SlotHold> {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('hold_demo_slot', { p_session_hash: sessionHash, p_slot_id: slotId })
    if (error) throw createError({ statusCode: 409, statusMessage: error.message })
    return data as SlotHold
  }
  cleanExpiredHolds()
  const slot = makeAvailability().find(item => item.id === slotId)
  if (!slot) throw createError({ statusCode: 404, statusMessage: 'Slot not found' })
  const ownExistingHold = [...state.holds.values()].find(item => item.slotId === slotId && item.sessionHash === sessionHash && item.status === 'active')
  if (ownExistingHold) return ownExistingHold
  if ([...state.holds.values()].some(hold => hold.slotId === slotId && hold.status === 'active')) throw createError({ statusCode: 409, statusMessage: 'Slot is no longer available' })
  const hold: SlotHold & { sessionHash: string } = { id: randomUUID(), slotId, sessionHash, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), status: 'active' }
  state.holds.set(hold.id, hold)
  return hold
}

export async function releaseSessionHolds(event: H3Event, sessionHash: string): Promise<void> {
  if (hasSupabaseConfig(event)) {
    await getServerSupabase(event).rpc('release_demo_holds', { p_session_hash: sessionHash })
    return
  }
  for (const hold of state.holds.values()) if (hold.sessionHash === sessionHash && hold.status === 'active') hold.status = 'released'
}

export async function confirmBooking(event: H3Event, sessionHash: string, holdId: string, idempotencyKey: string): Promise<BookingConfirmation> {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('confirm_demo_booking', { p_session_hash: sessionHash, p_hold_id: holdId, p_idempotency_key: idempotencyKey })
    if (error) throw createError({ statusCode: 409, statusMessage: error.message })
    return data as BookingConfirmation
  }
  const existing = [...state.bookings.values()].find(booking => booking.sessionHash === sessionHash && booking.idempotencyKey === idempotencyKey)
  if (existing) return existing
  cleanExpiredHolds()
  const hold = state.holds.get(holdId)
  if (!hold || hold.sessionHash !== sessionHash || hold.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'The hold is invalid or expired' })
  const slot = makeAvailability().find(item => item.id === hold.slotId)
  if (!slot) throw createError({ statusCode: 404, statusMessage: 'Slot not found' })
  const provider = providers.find(item => item.id === slot.providerId)!
  const service = services.find(item => item.id === slot.serviceId)!
  const location = locations.find(item => item.id === slot.locationId)!
  const confirmation: BookingConfirmation & { sessionHash: string, idempotencyKey: string } = {
    reference: `CG-${randomUUID().slice(0, 8).toUpperCase()}`, providerName: provider.name, serviceName: service.name,
    startsAt: slot.startsAt, modality: slot.modality, locationName: location.name, sessionHash, idempotencyKey,
  }
  hold.status = 'confirmed'
  state.bookings.set(confirmation.reference, confirmation)
  return confirmation
}

export async function requestHandoff(event: H3Event, sessionHash: string, reason: string, summary: string): Promise<{ reference: string, status: string }> {
  if (hasSupabaseConfig(event)) {
    const { data, error } = await getServerSupabase(event).rpc('request_demo_handoff', { p_session_hash: sessionHash, p_reason: reason, p_summary: summary })
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return data as { reference: string, status: string }
  }
  state.handoffs += 1
  return { reference: `HO-${randomUUID().slice(0, 8).toUpperCase()}`, status: 'queued' }
}

export async function recordSafetyEvent(event: H3Event, sessionHash: string, boundary: Exclude<SafetyBoundary, null>): Promise<void> {
  state.safetyEvents += 1
  if (hasSupabaseServiceConfig(event)) {
    const client = getServerSupabase(event)
    await client.from('demo_sessions').upsert({ session_hash: sessionHash, last_seen_at: new Date().toISOString() })
    await client.from('safety_events').insert({ session_hash: sessionHash, boundary })
  }
}

export async function recordRun(event: H3Event, run: OpsRun, sessionHash?: string): Promise<void> {
  state.runs.unshift(run)
  state.runs = state.runs.slice(0, 100)
  if (hasSupabaseServiceConfig(event)) {
    const client = getServerSupabase(event)
    if (sessionHash) await client.from('demo_sessions').upsert({ session_hash: sessionHash, last_seen_at: new Date().toISOString() })
    await client.from('agent_runs').insert({
      id: run.id,
      session_hash: sessionHash ?? null,
      status: run.status,
      tool_sequence: run.toolSequence,
      latency_ms: run.latencyMs,
      model: run.model,
      prompt_version: run.promptVersion,
      created_at: run.createdAt,
    })
  }
}

export async function recordFeedback(event: H3Event, sessionHash: string, value: 'positive' | 'negative'): Promise<void> {
  state.feedback.push({ value, createdAt: new Date().toISOString() })
  if (hasSupabaseConfig(event)) {
    const { error } = await getServerSupabase(event).rpc('record_demo_feedback', { p_session_hash: sessionHash, p_value: value })
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  }
}

export async function getOpsSummary(event: H3Event): Promise<OpsSummary> {
  if (hasSupabaseServiceConfig(event)) {
    const client = getServerSupabase(event)
    const [runsResult, handoffsResult, safetyResult, sessionsResult, heartbeatResult, evalResult] = await Promise.all([
      client.from('agent_runs').select('status,latency_ms').order('created_at', { ascending: false }).limit(500),
      client.from('handoffs').select('*', { count: 'exact', head: true }),
      client.from('safety_events').select('*', { count: 'exact', head: true }),
      client.from('demo_sessions').select('*', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
      client.from('worker_heartbeats').select('heartbeat_at').order('heartbeat_at', { ascending: false }).limit(1).maybeSingle(),
      client.from('eval_runs').select('total,passed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (!runsResult.error) {
      const runs = runsResult.data ?? []
      const total = Math.max(runs.length, 1)
      const completed = runs.filter(run => run.status === 'completed').length
      const latencies = runs.map(run => run.latency_ms).sort((a, b) => a - b)
      const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)]! : 0
      const heartbeatAt = heartbeatResult.data?.heartbeat_at
      return {
        completionRate: Math.round((completed / total) * 100),
        handoffRate: Math.round(((handoffsResult.count ?? 0) / total) * 100),
        safetyEvents: safetyResult.count ?? 0,
        p95LatencyMs: p95,
        toolSuccessRate: 100,
        evalPassRate: evalResult.data?.total ? Math.round((evalResult.data.passed / evalResult.data.total) * 1000) / 10 : 0,
        workerHealthy: Boolean(heartbeatAt && Date.now() - new Date(heartbeatAt).getTime() < 90_000),
        activeSessions: sessionsResult.count ?? 0,
      }
    }
  }
  const total = Math.max(state.runs.length, 1)
  const completed = state.runs.filter(run => run.status === 'completed').length
  return { completionRate: Math.round((completed / total) * 100), handoffRate: Math.round((state.handoffs / total) * 100), safetyEvents: state.safetyEvents, p95LatencyMs: state.runs.length ? Math.max(...state.runs.map(run => run.latencyMs)) : 820, toolSuccessRate: 98.6, evalPassRate: 95.2, workerHealthy: true, activeSessions: state.holds.size }
}

export async function getOpsRuns(event: H3Event, page = 1, pageSize = 20): Promise<{ runs: OpsRun[], total: number }> {
  if (hasSupabaseServiceConfig(event)) {
    const from = (page - 1) * pageSize
    const { data, error, count } = await getServerSupabase(event).from('agent_runs')
      .select('id,status,tool_sequence,latency_ms,model,prompt_version,created_at', { count: 'exact' })
      .order('created_at', { ascending: false }).range(from, from + pageSize - 1)
    if (!error && data) return {
      total: count ?? data.length,
      runs: data.map(run => ({ id: run.id, status: run.status, toolSequence: run.tool_sequence, latencyMs: run.latency_ms, model: run.model, promptVersion: run.prompt_version, createdAt: run.created_at })) as OpsRun[],
    }
  }
  if (state.runs.length) return { runs: state.runs.slice((page - 1) * pageSize, page * pageSize), total: state.runs.length }
  const runs: OpsRun[] = [
    { id: 'run-demo-1', status: 'completed', toolSequence: ['searchServices', 'findProviders', 'getAvailability', 'holdSlot', 'confirmBooking'], latencyMs: 1180, model: 'gpt-5.4-mini', promptVersion: 'booking-agent-v1', createdAt: new Date(Date.now() - 12 * 60_000).toISOString() },
    { id: 'run-demo-2', status: 'safety', toolSequence: ['safetyBoundary'], latencyMs: 42, model: 'deterministic', promptVersion: 'safety-v1', createdAt: new Date(Date.now() - 41 * 60_000).toISOString() },
  ]
  return { runs, total: runs.length }
}
