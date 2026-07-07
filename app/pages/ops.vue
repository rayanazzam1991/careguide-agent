<script setup lang="ts">
import type { OpsRun, OpsSummary } from '../types/careguide'

useHead({ title: 'Agent health' })

const { data: summary } = await useFetch<OpsSummary>('/api/ops/summary')
const { data: runs } = await useFetch<{ runs: OpsRun[] }>('/api/ops/runs')
const { data: evals } = await useFetch<{ latest: { total: number, passed: number, passRate: number }, categories: Array<{ name: string, passed: number, total: number }> }>('/api/ops/evals')

const metrics = computed(() => [
  { label: 'Booking completion', value: `${summary.value?.completionRate ?? 0}%`, note: 'completed flows' },
  { label: 'Tool success', value: `${summary.value?.toolSuccessRate ?? 0}%`, note: 'validated executions' },
  { label: 'P95 latency', value: `${summary.value?.p95LatencyMs ?? 0}ms`, note: 'agent turns' },
  { label: 'Eval pass rate', value: `${summary.value?.evalPassRate ?? 0}%`, note: '42 scenarios' },
])

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-AT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(iso))
}
</script>

<template>
  <div class="page-wrap ops-page">
    <header class="ops-hero">
      <div><span class="eyebrow">Production visibility</span><h1>Agent health, without patient exposure.</h1><p>Only structured, sanitized operational events appear here. Raw conversation text is deliberately absent.</p></div>
      <div class="health"><i :class="{ good: summary?.workerHealthy }" /><span>Worker</span><strong>{{ summary?.workerHealthy ? 'Healthy' : 'Unavailable' }}</strong></div>
    </header>

    <section class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric panel"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.note }}</small></article>
    </section>

    <section class="ops-grid">
      <article class="panel runs-panel">
        <header><div><span class="eyebrow">Recent traces</span><h2>Tool timelines</h2></div><span class="tag">Sanitized</span></header>
        <div class="run-list">
          <div v-for="run in runs?.runs" :key="run.id" class="run">
            <div class="run-top"><span :class="['status', run.status]">{{ run.status }}</span><strong>{{ run.model }}</strong><time>{{ formatTime(run.createdAt) }}</time><em>{{ run.latencyMs }}ms</em></div>
            <div class="tools"><template v-for="(tool, index) in run.toolSequence" :key="`${run.id}-${tool}`"><span>{{ tool }}</span><b v-if="index < run.toolSequence.length - 1">→</b></template></div>
          </div>
        </div>
      </article>

      <article class="panel eval-panel">
        <span class="eyebrow">Release gate</span><h2>{{ evals?.latest.passed }}/{{ evals?.latest.total }} passing</h2>
        <div class="score-ring" :style="{ '--score': `${evals?.latest.passRate ?? 0}%` }"><strong>{{ evals?.latest.passRate }}%</strong><span>overall</span></div>
        <div class="categories">
          <div v-for="category in evals?.categories" :key="category.name"><span>{{ category.name }}</span><strong>{{ category.passed }}/{{ category.total }}</strong><i><b :style="{ width: `${category.passed / category.total * 100}%` }" /></i></div>
        </div>
      </article>
    </section>

    <section class="guardrails panel">
      <div><span class="eyebrow">Hard invariants</span><h2>Reliability lives outside the prompt.</h2></div>
      <ul><li><strong>100%</strong> explicit booking approval</li><li><strong>100%</strong> cross-session isolation</li><li><strong>{{ summary?.safetyEvents ?? 0 }}</strong> safety boundaries triggered</li><li><strong>5 min</strong> transactional slot holds</li></ul>
    </section>
  </div>
</template>

<style scoped>
.ops-hero { display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: end; }.ops-hero h1 { max-width: 800px; }.ops-hero p { color: var(--muted); max-width: 620px; }.health { min-width: 170px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; display: grid; grid-template-columns: auto 1fr; gap: 3px 9px; background: white; }.health i { grid-row: 1/3; width: 11px; height: 11px; border-radius: 50%; background: #aaa; margin-top: 7px; }.health i.good { background: #2da16e; box-shadow: 0 0 0 5px #dff5e9; }.health span { color: var(--muted); font-size: 11px; }.metric-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 38px 0 18px; }.metric { padding: 19px; display: flex; flex-direction: column; }.metric span { color: var(--muted); font-size: 11px; }.metric strong { font: 700 34px 'Manrope'; margin: 10px 0; }.metric small { color: var(--green); }.ops-grid { display: grid; grid-template-columns: 1.5fr .8fr; gap: 18px; }.runs-panel, .eval-panel { padding: 25px; }.runs-panel > header { display: flex; justify-content: space-between; }.runs-panel h2, .eval-panel h2 { font-size: 25px; margin-top: 4px; }.run { padding: 17px 0; border-top: 1px solid var(--line); }.run-top { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 10px; font-size: 11px; }.run-top time, .run-top em { color: var(--muted); font-style: normal; }.status { padding: 4px 7px; border-radius: 99px; background: #e5f5eb; color: var(--green); font-weight: 700; }.status.safety { background: #fff0e4; color: #a25b24; }.status.failed { background: #ffebe9; color: var(--red); }.tools { display: flex; gap: 6px; align-items: center; overflow-x: auto; margin-top: 12px; }.tools span { padding: 6px 8px; border-radius: 8px; background: #f1f3ee; font: 600 9px monospace; white-space: nowrap; }.tools b { color: #aeb5b0; }.score-ring { width: 130px; height: 130px; border-radius: 50%; margin: 22px auto; display: grid; place-content: center; text-align: center; background: conic-gradient(var(--green) var(--score), #e8ebe5 0); position: relative; }.score-ring::after { content: ''; position: absolute; inset: 9px; border-radius: 50%; background: var(--card); }.score-ring strong,.score-ring span { position: relative; z-index: 1; }.score-ring strong { font: 700 25px 'Manrope'; }.score-ring span { color: var(--muted); font-size: 10px; }.categories > div { display: grid; grid-template-columns: 1fr auto; gap: 6px; margin-top: 11px; font-size: 10px; }.categories i { grid-column: 1/-1; height: 4px; background: #e8ebe5; border-radius: 9px; overflow: hidden; }.categories i b { display: block; height: 100%; background: var(--green); }.guardrails { margin-top: 18px; padding: 30px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 50px; }.guardrails h2 { margin-top: 5px; }.guardrails ul { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; list-style: none; padding: 0; }.guardrails li { border-top: 1px solid var(--line); padding-top: 11px; color: var(--muted); font-size: 11px; }.guardrails li strong { color: var(--ink); display: block; font: 700 21px 'Manrope'; }
@media (max-width: 900px) { .metric-grid { grid-template-columns: 1fr 1fr; }.ops-grid, .guardrails { grid-template-columns: 1fr; }.ops-hero { grid-template-columns: 1fr; }.health { width: max-content; } } @media (max-width: 520px) { .metric-grid { grid-template-columns: 1fr; }.run-top { grid-template-columns: auto 1fr; }.guardrails ul { grid-template-columns: 1fr; } }
</style>
