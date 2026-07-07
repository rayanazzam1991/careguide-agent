import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCareGuideConfig } from './config'

const AUTH_COOKIE = 'careguide_auth_session'
const SESSION_SECONDS = 60 * 60 * 12

export function isAuthEnabled(event: H3Event): boolean {
  const config = getCareGuideConfig(event)
  return Boolean(config.authUsername && config.authPassword)
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function credentialsMatch(event: H3Event, username: string, password: string): boolean {
  const config = getCareGuideConfig(event)
  return timingSafeEqual(digest(username), digest(config.authUsername))
    && timingSafeEqual(digest(password), digest(config.authPassword))
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function setAuthSession(event: H3Event) {
  const config = getCareGuideConfig(event)
  if (!config.sessionSecret) throw createError({ statusCode: 503, statusMessage: 'Session signing is not configured' })
  const payload = Buffer.from(JSON.stringify({ username: config.authUsername, expiresAt: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url')
  setCookie(event, AUTH_COOKIE, `${payload}.${signature(payload, config.sessionSecret)}`, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export function clearAuthSession(event: H3Event) {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

export function getAuthenticatedUser(event: H3Event): string | null {
  if (!isAuthEnabled(event)) return null
  const config = getCareGuideConfig(event)
  const cookie = getCookie(event, AUTH_COOKIE)
  if (!cookie || !config.sessionSecret) return null
  const [payload, receivedSignature] = cookie.split('.')
  if (!payload || !receivedSignature || !timingSafeEqual(digest(receivedSignature), digest(signature(payload, config.sessionSecret)))) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { username?: string, expiresAt?: number }
    if (session.username !== config.authUsername || !session.expiresAt || session.expiresAt <= Date.now()) return null
    return session.username
  } catch {
    clearAuthSession(event)
    return null
  }
}
