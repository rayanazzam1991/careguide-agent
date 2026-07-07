import { getCareGuideConfig } from '../utils/config'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const JSON_BODY_ROUTES = new Set(['/api/chat', '/api/feedback', '/api/demo/hold', '/api/demo/confirm'])

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  })
  if (!event.path.startsWith('/api/') || !MUTATING.has(event.method)) return
  const length = Number(getHeader(event, 'content-length') || 0)
  if (length > 65_536) throw createError({ statusCode: 413, statusMessage: 'Request too large' })
  if (JSON_BODY_ROUTES.has(event.path) && !getHeader(event, 'content-type')?.toLowerCase().startsWith('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Content-Type must be application/json' })
  }
  const origin = getHeader(event, 'origin')
  const publicConfig = getCareGuideConfig(event).public
  if (origin && publicConfig.appOrigin && origin !== publicConfig.appOrigin && !publicConfig.demoMode && !import.meta.dev) throw createError({ statusCode: 403, statusMessage: 'Origin not allowed' })
})
