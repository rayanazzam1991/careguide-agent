<script setup lang="ts">
useHead({ title: 'Case study' })

const decisions = [
  { number: '01', title: 'Tools over prose', body: 'Availability, holds, and bookings are typed operations. The model never invents operational state.' },
  { number: '02', title: 'Approval over autonomy', body: 'The model can prepare a booking, but only the user can authorize the final write.' },
  { number: '03', title: 'Relational retrieval', body: 'Fresh scheduling data belongs in indexed SQL and RPCs—not in a stale vector store.' },
  { number: '04', title: 'Clinical firewall', body: 'The product coordinates access to care. It does not assess, diagnose, or choose treatment.' },
]
</script>

<template>
  <div class="page-wrap case-page">
    <section class="case-hero">
      <span class="eyebrow">Product engineering case study</span>
      <h1>An agent that earns the right to act.</h1>
      <p>CareGuide is a production-shaped exploration of AI-native healthcare operations: a useful conversational layer, deterministic business rules, explicit consent, and visibility from day one.</p>
      <div class="hero-links"><NuxtLink class="button button-primary" to="/">Try the booking flow</NuxtLink><NuxtLink class="button button-secondary" to="/ops">Inspect agent health</NuxtLink></div>
    </section>

    <section class="architecture panel">
      <div><span class="eyebrow">System map</span><h2>The model proposes. The system disposes.</h2></div>
      <div class="flow">
        <span>Patient UI<small>Nuxt + Vue</small></span><b>→</b><span>Agent loop<small>AI SDK + OpenAI</small></span><b>→</b><span>Typed tools<small>Zod + state machine</small></span><b>→</b><span>Data boundary<small>Supabase RPC + RLS</small></span><b>→</b><span>Outbox worker<small>Retry + monitoring</small></span>
      </div>
    </section>

    <section class="decisions">
      <div><span class="eyebrow">Product judgment</span><h2>Four decisions that shape the product.</h2></div>
      <article v-for="decision in decisions" :key="decision.number"><span>{{ decision.number }}</span><h3>{{ decision.title }}</h3><p>{{ decision.body }}</p></article>
    </section>

    <section class="firewall">
      <div class="firewall-copy"><span class="eyebrow">Safety model</span><h2>Outside the medical-device boundary by design.</h2><p>CareGuide can surface approved operational information, coordinate appointments, and draft a handoff. Clinical questions stop the automated flow. Explicit emergency language receives fixed official contact guidance.</p></div>
      <div class="boundary panel"><div class="allowed"><strong>Agent may</strong><span>Search approved services</span><span>Filter fictional providers</span><span>Hold availability</span><span>Draft a human handoff</span></div><div class="blocked"><strong>Agent never</strong><span>Diagnoses symptoms</span><span>Recommends treatment</span><span>Ranks clinical urgency</span><span>Books without approval</span></div></div>
    </section>

    <section class="demo-script panel">
      <span class="eyebrow">Two-minute walkthrough</span><h2>Show the evidence, not the adjectives.</h2>
      <ol><li><strong>0:00</strong><span>Ask for an online dermatology appointment and show structured tool results.</span></li><li><strong>0:35</strong><span>Select and hold a slot, then highlight the mandatory approval boundary.</span></li><li><strong>1:05</strong><span>Try a clinical or prompt-injection request and show the deterministic interruption.</span></li><li><strong>1:30</strong><span>Open Agent Health to inspect the sanitized trace, eval gates, worker, and latency.</span></li></ol>
    </section>
  </div>
</template>

<style scoped>
.case-hero { max-width: 900px; padding: 30px 0 70px; }.case-hero p { max-width: 720px; color: var(--muted); font-size: 19px; }.hero-links { display: flex; gap: 10px; margin-top: 30px; }.architecture { padding: 35px; }.architecture > div:first-child { display: flex; justify-content: space-between; align-items: end; gap: 30px; }.architecture h2 { max-width: 520px; }.flow { display: flex; align-items: center; gap: 12px; border-top: 1px solid var(--line); margin-top: 20px; padding-top: 25px; overflow-x: auto; }.flow span { min-width: 150px; background: #f1f6f2; border: 1px solid #dce7df; border-radius: 14px; padding: 13px; font-weight: 700; font-size: 12px; }.flow small { display: block; color: var(--muted); margin-top: 5px; font-weight: 500; }.flow b { color: var(--green); }.decisions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin: 80px 0; }.decisions > div { grid-row: span 2; padding-right: 30px; }.decisions article { border-top: 1px solid var(--line); padding: 18px 5px; }.decisions article span { color: var(--orange); font: 700 11px monospace; }.decisions article h3 { font-size: 18px; margin: 8px 0; }.decisions article p { color: var(--muted); font-size: 13px; margin: 0; }.firewall { display: grid; grid-template-columns: 1fr 1.2fr; gap: 70px; align-items: center; margin-bottom: 80px; }.firewall-copy p { color: var(--muted); }.boundary { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }.boundary > div { padding: 25px; display: flex; flex-direction: column; gap: 11px; }.boundary strong { margin-bottom: 8px; }.boundary span { font-size: 12px; color: var(--muted); }.allowed { background: #eff8f2; }.blocked { background: #fff5ef; }.demo-script { padding: 38px; }.demo-script ol { list-style: none; padding: 0; margin: 28px 0 0; }.demo-script li { display: grid; grid-template-columns: 80px 1fr; gap: 20px; padding: 15px 0; border-top: 1px solid var(--line); }.demo-script li strong { color: var(--green); font-family: monospace; }.demo-script li span { color: var(--muted); }
@media (max-width: 850px) { .decisions { grid-template-columns: 1fr 1fr; }.decisions > div { grid-column: 1/-1; grid-row: auto; }.firewall { grid-template-columns: 1fr; }.architecture > div:first-child { display: block; } } @media (max-width: 540px) { .decisions, .boundary { grid-template-columns: 1fr; }.hero-links { flex-direction: column; } }
</style>
