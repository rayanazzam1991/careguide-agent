import { z } from 'zod'
import { credentialsMatch, isAuthEnabled, setAuthSession } from '../../utils/auth'
import { recordSuccessfulLogin } from '../../utils/login-audit'

const attempts = new Map<string, { count: number, resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(1000),
})

export default defineEventHandler(async (event) => {
  if (!isAuthEnabled(event)) throw createError({ statusCode: 503, statusMessage: 'Login is not configured' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const clientAddress = getHeader(event, 'x-real-ip') || getRequestIP(event) || 'unknown'
  const now = Date.now()
  const current = attempts.get(clientAddress)
  const attempt = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current
  if (attempt.count >= MAX_ATTEMPTS) throw createError({ statusCode: 429, statusMessage: 'Too many login attempts' })

  const parsed = credentialsSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Enter your username and password' })

  if (!credentialsMatch(event, parsed.data.username, parsed.data.password)) {
    attempts.set(clientAddress, { ...attempt, count: attempt.count + 1 })
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }
  attempts.delete(clientAddress)
  setAuthSession(event)
  await recordSuccessfulLogin(event, parsed.data.username)
  return { authenticated: true, username: parsed.data.username }
})
