<script setup lang="ts">
useHead({ title: 'AI healthcare booking, done carefully' })

async function resetDemo() {
  await $fetch('/api/session/reset', { method: 'POST' })
  await reloadNuxtApp()
}
</script>

<template>
  <div class="booking-page">
    <section class="intro page-wrap">
      <div>
        <span class="eyebrow">AI-first, human when it counts</span>
        <h1>Book care without the back-and-forth.</h1>
        <p>CareGuide turns a conversation into a structured booking flow—while keeping clinical decisions with qualified humans.</p>
      </div>
      <div class="intro-meta">
        <div><strong>4</strong><span>services</span></div>
        <div><strong>6</strong><span>providers</span></div>
        <div><strong>0</strong><span>real patients</span></div>
        <button type="button" @click="resetDemo">Reset demo ↻</button>
      </div>
    </section>

    <section class="demo-grid page-wrap">
      <BookingChat />
      <BookingWorkspace />
    </section>

    <section class="safety-strip">
      <div class="page-wrap">
        <span class="eyebrow">Medical-device firewall</span>
        <h2>The agent coordinates. Humans decide.</h2>
        <p>Clinical questions exit automation. Explicit emergency language receives fixed Austrian guidance: ambulance 144, European emergency 112, health advice 1450.</p>
        <NuxtLink class="button button-secondary" to="/case-study">Read the safety rationale</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(250px, .5fr); gap: 60px; align-items: end; padding-bottom: 35px; }.intro h1 { max-width: 800px; }.intro p { max-width: 650px; color: var(--muted); font-size: 18px; }.intro-meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }.intro-meta div { padding: 14px 7px; border-top: 1px solid var(--line); display: flex; flex-direction: column; }.intro-meta strong { font: 700 22px 'Manrope'; }.intro-meta span { color: var(--muted); font-size: 10px; }.intro-meta button { grid-column: 1/-1; border: 0; background: none; color: var(--green); text-align: left; padding: 8px 0; cursor: pointer; font-weight: 700; }.demo-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, .8fr); gap: 18px; padding-top: 0; }.safety-strip { background: var(--ink); color: white; margin-top: 30px; }.safety-strip .page-wrap { padding-block: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 70px; }.safety-strip .eyebrow { color: var(--mint); grid-column: 1/-1; }.safety-strip p { color: #b8c9c3; max-width: 550px; }.safety-strip .button { align-self: end; justify-self: start; }
@media (max-width: 900px) { .intro, .demo-grid { grid-template-columns: 1fr; }.intro { gap: 25px; }.safety-strip .page-wrap { grid-template-columns: 1fr; }.demo-grid { width: min(680px, 92vw); } }
</style>
