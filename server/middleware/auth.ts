import { getAuthenticatedUser, isAuthEnabled } from '../utils/auth'

const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health/']

export default defineEventHandler(async (event) => {
  if (!isAuthEnabled(event) || !event.path.startsWith('/api/')) return
  if (PUBLIC_API_PREFIXES.some(prefix => event.path.startsWith(prefix))) return
  if (!getAuthenticatedUser(event)) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
})
