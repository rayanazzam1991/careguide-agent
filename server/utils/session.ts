import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCareGuideConfig } from './config'

const COOKIE_NAME = 'careguide_demo_session'

function getSecret(event: H3Event): string {
  const configured = getCareGuideConfig(event).sessionSecret
  if (configured) return configured
  if (import.meta.dev) return 'careguide-local-development-secret-change-me'
  throw createError({ statusCode: 503, statusMessage: 'Session signing is not configured' })
}

function sign(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('base64url')
}

function validSignature(token: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(token, secret))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function hashSession(token: string, event: H3Event): string {
  const salt = getCareGuideConfig(event).hashingSalt || 'careguide-local-salt'
  return createHash('sha256').update(`${salt}:${token}`).digest('hex')
}

export function hashIdentity(value: string, event: H3Event): string {
  const salt = getCareGuideConfig(event).hashingSalt || 'careguide-local-salt'
  return createHash('sha256').update(`${salt}:identity:${value}`).digest('hex')
}

export function ensureDemoSession(event: H3Event, rotate = false): { token: string, hash: string } {
  const secret = getSecret(event)
  const current = rotate ? undefined : getCookie(event, COOKIE_NAME)
  if (current) {
    const [token, signature] = current.split('.')
    if (token && signature && validSignature(token, signature, secret)) return { token, hash: hashSession(token, event) }
  }

  const token = randomBytes(24).toString('base64url')
  setCookie(event, COOKIE_NAME, `${token}.${sign(token, secret)}`, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return { token, hash: hashSession(token, event) }
}
