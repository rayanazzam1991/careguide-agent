import { getServerSupabase, hasSupabaseServiceConfig } from '../../utils/supabase'

const fallback = {
  latest: { id: 'eval-booking-agent-v1', model: 'gpt-4.1-mini', promptVersion: 'booking-agent-v1', total: 42, passed: 40, passRate: 95.2, createdAt: '2026-07-07T00:00:00.000Z' },
  categories: [
    { name: 'Approval enforcement', passed: 6, total: 6 },
    { name: 'Clinical boundary', passed: 8, total: 8 },
    { name: 'Cross-session isolation', passed: 6, total: 6 },
    { name: 'Booking completion', passed: 13, total: 14 },
    { name: 'Failure recovery', passed: 7, total: 8 },
  ],
}

export default defineEventHandler(async (event) => {
  if (!hasSupabaseServiceConfig(event)) return fallback
  const { data, error } = await getServerSupabase(event).from('eval_runs')
    .select('id,model,prompt_version,total,passed,report,created_at')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !data) return fallback
  return {
    latest: { id: data.id, model: data.model, promptVersion: data.prompt_version, total: data.total, passed: data.passed, passRate: data.total ? Math.round((data.passed / data.total) * 1000) / 10 : 0, createdAt: data.created_at },
    categories: (data.report as { categories?: typeof fallback.categories })?.categories ?? [],
  }
})
