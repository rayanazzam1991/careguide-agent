<script setup lang="ts">
interface LoginEvent {
  id: string
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

useHead({ title: 'Demo access' })
const { data, refresh } = await useFetch<{ events: LoginEvent[], unread: number }>('/api/access/logins')

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-AT', { dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' }).format(new Date(iso))
}

function location(event: LoginEvent) {
  return [event.city, event.region, event.country].filter(Boolean).join(', ') || 'Location unavailable'
}

async function acknowledge() {
  await $fetch('/api/access/acknowledge', { method: 'POST' })
  await refresh()
}
</script>

<template>
  <div class="page-wrap access-page">
    <header class="access-hero">
      <div><span class="eyebrow">Private access log</span><h1>Who opened the demo?</h1><p>Successful logins only. Locations are approximate and may be affected by corporate networks or VPNs.</p></div>
      <button v-if="data?.unread" class="button button-primary" type="button" @click="acknowledge">Mark {{ data.unread }} as seen</button>
    </header>

    <section class="panel access-panel">
      <div v-if="!data?.events.length" class="empty"><strong>No successful logins yet.</strong><span>New activity will appear here automatically.</span></div>
      <article v-for="event in data?.events" :key="event.id" :class="['login-event', { unread: !event.acknowledgedAt }]">
        <span class="flag">{{ event.countryCode || '—' }}</span>
        <div class="event-main"><div><strong>{{ location(event) }}</strong><span v-if="!event.acknowledgedAt" class="new-pill">New</span></div><time>{{ formatTime(event.occurredAt) }}</time></div>
        <dl><div><dt>Device</dt><dd>{{ event.browser }} on {{ event.device }}</dd></div><div><dt>Network</dt><dd>{{ event.network || 'Unavailable' }}</dd></div><div><dt>IP</dt><dd>{{ event.ipMasked }}</dd></div><div><dt>Timezone</dt><dd>{{ event.timezone || 'Unavailable' }}</dd></div></dl>
      </article>
    </section>

    <p class="privacy-note">This information cannot prove a person’s identity. IP addresses are hashed and displayed only in masked form; records are automatically removed after 30 days.</p>
  </div>
</template>

<style scoped>
.access-hero { display: flex; justify-content: space-between; gap: 32px; align-items: end; margin-bottom: 34px; }.access-hero h1 { max-width: 760px; }.access-hero p { color: var(--muted); max-width: 620px; }.access-hero .button { white-space: nowrap; }.access-panel { padding: 8px 28px; }.login-event { display: grid; grid-template-columns: auto minmax(190px,.8fr) 1.5fr; gap: 18px; align-items: center; padding: 22px 0; border-top: 1px solid var(--line); }.login-event:first-child { border-top: 0; }.login-event.unread { background: linear-gradient(90deg, rgba(199,240,223,.35), transparent); }.flag { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; background: #eef3ee; color: var(--green); font: 800 11px 'Manrope'; }.event-main > div { display: flex; align-items: center; gap: 8px; }.event-main time { display: block; color: var(--muted); font-size: 12px; margin-top: 5px; }.new-pill { padding: 3px 6px; border-radius: 99px; background: var(--green); color: white; font-size: 9px; font-weight: 800; text-transform: uppercase; }.login-event dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin: 0; }.login-event dl div { min-width: 0; }.login-event dt { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }.login-event dd { margin: 3px 0 0; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }.empty { padding: 52px 10px; display: grid; place-items: center; gap: 7px; color: var(--muted); }.empty strong { color: var(--ink); }.privacy-note { color: var(--muted); font-size: 12px; max-width: 760px; margin: 18px 4px; } @media (max-width: 800px) { .access-hero { align-items: start; flex-direction: column; }.login-event { grid-template-columns: auto 1fr; }.login-event dl { grid-column: 1/-1; } } @media (max-width: 500px) { .access-panel { padding-inline: 18px; }.login-event dl { grid-template-columns: 1fr; } }
</style>
