import { createHash, randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import nodemailer from 'nodemailer'
import { getCareGuideConfig } from './config'
import { getServerSupabase, hasSupabaseServiceConfig } from './supabase'

export interface LoginEvent {
  id: string
  username: string
  occurredAt: string
  ipMasked: string
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  timezone: string | null
  network: string | null
  browser: string
  device: string
  acknowledgedAt: string | null
}

interface GeoResult {
  success?: boolean
  country?: string
  country_code?: string
  region?: string
  city?: string
  timezone?: { id?: string }
  connection?: { org?: string, isp?: string }
}

const memoryEvents: LoginEvent[] = []

export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  if (ip.includes('.')) {
    const parts = ip.split('.')
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.xxx` : 'unknown'
  }
  const parts = ip.split(':').filter(Boolean)
  return parts.length ? `${parts.slice(0, 3).join(':')}::…` : 'unknown'
}

export function describeUserAgent(userAgent: string): { browser: string, device: string } {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /OPR\//.test(userAgent) ? 'Opera' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : /Firefox\//.test(userAgent) ? 'Firefox' : 'Unknown browser'
  const device = /iPhone/.test(userAgent) ? 'iPhone' : /iPad/.test(userAgent) ? 'iPad' : /Android/.test(userAgent) ? 'Android device' : /Macintosh/.test(userAgent) ? 'Mac' : /Windows/.test(userAgent) ? 'Windows PC' : /Linux/.test(userAgent) ? 'Linux device' : 'Unknown device'
  return { browser, device }
}

function getClientIp(event: H3Event): string {
  return (getHeader(event, 'x-real-ip') || getRequestIP(event, { xForwardedFor: true }) || 'unknown').trim()
}

async function lookupGeo(ip: string): Promise<GeoResult | null> {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return null
  try {
    return await $fetch<GeoResult>(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      query: { fields: 'success,country,country_code,region,city,timezone,connection' },
      timeout: 1800,
    })
  } catch {
    return null
  }
}

async function notifyWebhook(event: H3Event, login: LoginEvent): Promise<void> {
  const webhook = getCareGuideConfig(event).loginAlertWebhookUrl
  if (!webhook) return
  const location = [login.city, login.region, login.country].filter(Boolean).join(', ') || 'Location unavailable'
  const content = `CareGuide login: ${location} · ${login.browser} on ${login.device} · ${login.occurredAt}`
  try {
    await $fetch(webhook, { method: 'POST', body: { content, text: content, event: login }, timeout: 2500 })
  } catch (error) {
    console.warn('Login alert webhook failed', error instanceof Error ? error.message : 'unknown error')
  }
}

function formatLocation(login: LoginEvent): string {
  return [login.city, login.region, login.country].filter(Boolean).join(', ') || 'Location unavailable'
}

async function notifyEmail(event: H3Event, login: LoginEvent): Promise<void> {
  const config = getCareGuideConfig(event)
  if (!config.loginAlertEmail || !config.smtpUser || !config.smtpAppPassword) return

  const location = formatLocation(login)
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.smtpUser, pass: config.smtpAppPassword.replace(/\s/g, '') },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  })

  try {
    await transport.sendMail({
      from: `CareGuide Alerts <${config.smtpUser}>`,
      to: config.loginAlertEmail,
      subject: `CareGuide login from ${login.country || 'an unknown location'}`,
      text: [
        'A successful login was recorded for your CareGuide demo.',
        '',
        `Time: ${login.occurredAt}`,
        `Location: ${location}`,
        `IP address: ${login.ipMasked}`,
        `Network: ${login.network || 'Unavailable'}`,
        `Browser and device: ${login.browser} on ${login.device}`,
        '',
        'Review access: https://careguide.forvexa.com/access',
      ].join('\n'),
    })
  } catch (error) {
    console.warn('Login alert email failed', error instanceof Error ? error.message : 'unknown error')
  } finally {
    transport.close()
  }
}

export async function recordSuccessfulLogin(event: H3Event, username: string): Promise<void> {
  const ip = getClientIp(event)
  const geo = await lookupGeo(ip)
  const agent = describeUserAgent(getHeader(event, 'user-agent') || '')
  const login: LoginEvent = {
    id: randomUUID(),
    username,
    occurredAt: new Date().toISOString(),
    ipMasked: maskIp(ip),
    country: geo?.success === false ? null : geo?.country ?? null,
    countryCode: geo?.success === false ? null : geo?.country_code ?? null,
    region: geo?.success === false ? null : geo?.region ?? null,
    city: geo?.success === false ? null : geo?.city ?? null,
    timezone: geo?.success === false ? null : geo?.timezone?.id ?? null,
    network: geo?.success === false ? null : geo?.connection?.org ?? geo?.connection?.isp ?? null,
    browser: agent.browser,
    device: agent.device,
    acknowledgedAt: null,
  }

  memoryEvents.unshift(login)
  memoryEvents.splice(100)
  if (hasSupabaseServiceConfig(event)) {
    const config = getCareGuideConfig(event)
    const { error } = await getServerSupabase(event).from('login_events').insert({
      id: login.id,
      username: login.username,
      occurred_at: login.occurredAt,
      ip_hash: createHash('sha256').update(`${config.hashingSalt}:${ip}`).digest('hex'),
      ip_masked: login.ipMasked,
      country: login.country,
      country_code: login.countryCode,
      region: login.region,
      city: login.city,
      timezone: login.timezone,
      network: login.network,
      browser: login.browser,
      device: login.device,
    })
    if (error) console.warn('Login audit persistence failed', error.message)
  }
  await Promise.all([notifyWebhook(event, login), notifyEmail(event, login)])
}

export async function listLoginEvents(event: H3Event): Promise<LoginEvent[]> {
  if (hasSupabaseServiceConfig(event)) {
    const { data, error } = await getServerSupabase(event).from('login_events').select('id,username,occurred_at,ip_masked,country,country_code,region,city,timezone,network,browser,device,acknowledged_at').order('occurred_at', { ascending: false }).limit(100)
    if (!error && data) return data.map(row => ({
      id: row.id,
      username: row.username,
      occurredAt: row.occurred_at,
      ipMasked: row.ip_masked,
      country: row.country,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      timezone: row.timezone,
      network: row.network,
      browser: row.browser,
      device: row.device,
      acknowledgedAt: row.acknowledged_at,
    }))
  }
  return memoryEvents
}

export async function acknowledgeLoginEvents(event: H3Event): Promise<void> {
  const acknowledgedAt = new Date().toISOString()
  memoryEvents.forEach(item => { item.acknowledgedAt ??= acknowledgedAt })
  if (hasSupabaseServiceConfig(event)) {
    const { error } = await getServerSupabase(event).from('login_events').update({ acknowledged_at: acknowledgedAt }).is('acknowledged_at', null)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not acknowledge login events' })
  }
}
