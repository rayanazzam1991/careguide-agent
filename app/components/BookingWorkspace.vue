<script setup lang="ts">
import type { AvailabilitySlot, BookingConfirmation, ProviderCard, ServiceCard, SlotHold } from '../types/careguide'

interface Bootstrap {
  services: ServiceCard[]
  providers: ProviderCard[]
  locations: Array<{ id: string, name: string }>
  demoPatient: { name: string, email: string }
}

const { data } = await useFetch<Bootstrap>('/api/demo/bootstrap')
const selectedServiceId = ref('')
const selectedProviderId = ref('')
const selectedSlotId = ref('')
const slots = ref<AvailabilitySlot[]>([])
const hold = ref<SlotHold | null>(null)
const confirmation = ref<BookingConfirmation | null>(null)
const loading = ref(false)
const message = ref('')
const hydrated = ref(false)

onMounted(() => { hydrated.value = true })

const matchingProviders = computed(() => data.value?.providers.filter(provider => provider.serviceIds.includes(selectedServiceId.value)) ?? [])
const selectedService = computed(() => data.value?.services.find(service => service.id === selectedServiceId.value))

watch(selectedServiceId, () => { selectedProviderId.value = ''; selectedSlotId.value = ''; slots.value = []; hold.value = null })

async function loadSlots() {
  if (!selectedServiceId.value || !selectedProviderId.value) return
  loading.value = true
  try {
    const result = await $fetch<{ slots: AvailabilitySlot[] }>('/api/demo/availability', { query: { serviceId: selectedServiceId.value, providerId: selectedProviderId.value } })
    slots.value = result.slots.slice(0, 8)
  } finally { loading.value = false }
}

async function holdSelectedSlot() {
  if (!selectedSlotId.value) return
  loading.value = true
  message.value = ''
  try {
    hold.value = await $fetch<SlotHold>('/api/demo/hold', { method: 'POST', body: { slotId: selectedSlotId.value } })
  } catch { message.value = 'That slot was just taken. Please choose another.' }
  finally { loading.value = false }
}

async function confirm() {
  if (!hold.value) return
  loading.value = true
  try {
    confirmation.value = await $fetch<BookingConfirmation>('/api/demo/confirm', { method: 'POST', body: { holdId: hold.value.id, approved: true } })
  } finally { loading.value = false }
}

function formatSlot(iso: string) {
  return new Intl.DateTimeFormat('en-AT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }).format(new Date(iso))
}
</script>

<template>
  <aside class="workspace panel" data-testid="booking-workspace" :data-hydrated="hydrated">
    <header>
      <div>
        <span class="eyebrow">Booking workspace</span>
        <h2>See the tools work.</h2>
      </div>
      <span class="step">{{ confirmation ? 'Done' : hold ? '4 / 4' : selectedSlotId ? '3 / 4' : selectedProviderId ? '2 / 4' : '1 / 4' }}</span>
    </header>

    <div v-if="confirmation" class="confirmed">
      <span class="check">✓</span>
      <span class="eyebrow">Fictional booking confirmed</span>
      <h3>{{ confirmation.serviceName }}</h3>
      <dl>
        <div><dt>Provider</dt><dd>{{ confirmation.providerName }}</dd></div>
        <div><dt>Time</dt><dd>{{ formatSlot(confirmation.startsAt) }}</dd></div>
        <div><dt>Visit</dt><dd>{{ confirmation.locationName }}</dd></div>
        <div><dt>Reference</dt><dd>{{ confirmation.reference }}</dd></div>
      </dl>
    </div>

    <template v-else>
      <section>
        <label>1. Choose a service</label>
        <div class="service-grid">
          <button v-for="service in data?.services" :key="service.id" type="button" :class="{ selected: selectedServiceId === service.id }" :style="{ '--accent': service.accent }" @click="selectedServiceId = service.id">
            <i /> <strong>{{ service.name }}</strong><span>€{{ (service.priceCents / 100).toFixed(0) }} · {{ service.durationMinutes }} min</span>
          </button>
        </div>
      </section>

      <section v-if="selectedServiceId">
        <label>2. Choose a provider</label>
        <select v-model="selectedProviderId" @change="loadSlots">
          <option value="">Select a provider</option>
          <option v-for="provider in matchingProviders" :key="provider.id" :value="provider.id">{{ provider.name }} · {{ provider.modalities.join(' / ') }}</option>
        </select>
      </section>

      <section v-if="selectedProviderId">
        <label>3. Choose a Vienna time</label>
        <div v-if="loading && !slots.length" class="skeleton">Checking live availability…</div>
        <div class="slots">
          <button v-for="slot in slots" :key="slot.id" type="button" :class="{ selected: selectedSlotId === slot.id }" @click="selectedSlotId = slot.id">{{ formatSlot(slot.startsAt) }}<small>{{ slot.modality }}</small></button>
        </div>
      </section>

      <section v-if="selectedSlotId && !hold">
        <button class="button button-primary full" type="button" :disabled="loading" @click="holdSelectedSlot">Hold this slot for 5 minutes</button>
      </section>

      <section v-if="hold" class="review">
        <span class="eyebrow">Explicit approval required</span>
        <h3>Confirm for Alex Demo?</h3>
        <p>This writes a synthetic booking. No email is sent, no payment is taken, and no real health record is created.</p>
        <div class="review-line"><span>{{ selectedService?.name }}</span><strong>{{ formatSlot(slots.find(slot => slot.id === selectedSlotId)?.startsAt ?? '') }}</strong></div>
        <button class="button button-primary full" type="button" :disabled="loading" @click="confirm">I approve this demo booking</button>
      </section>
      <p v-if="message" class="error">{{ message }}</p>
    </template>
  </aside>
</template>

<style scoped>
.workspace { padding: 26px; min-height: 680px; }
.workspace > header { display: flex; justify-content: space-between; gap: 20px; align-items: start; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
h2 { font-size: 25px; margin: 5px 0 0; }.step { border: 1px solid var(--line); border-radius: 99px; padding: 6px 9px; font-size: 11px; color: var(--muted); }
section { padding-top: 22px; }label { display: block; margin-bottom: 10px; font-size: 12px; font-weight: 800; }
.service-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.service-grid button { text-align: left; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: white; cursor: pointer; display: grid; grid-template-columns: auto 1fr; gap: 3px 8px; color: var(--ink); }
.service-grid i { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); margin-top: 4px; }.service-grid strong { font-size: 12px; }.service-grid span { grid-column: 2; color: var(--muted); font-size: 10px; }
button.selected { border-color: var(--green); box-shadow: 0 0 0 2px rgba(13,108,83,.12); background: #f8fffb; }
select { width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 12px; color: var(--ink); background: white; }
.slots { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.slots button { border: 1px solid var(--line); background: white; border-radius: 11px; padding: 9px; color: var(--ink); cursor: pointer; font-size: 11px; }.slots small { display: block; color: var(--muted); margin-top: 3px; text-transform: capitalize; }
.skeleton { color: var(--muted); padding: 15px; background: #f3f5f1; border-radius: 10px; font-size: 12px; }.full { width: 100%; }.review { background: #eef8f2; border: 1px solid #cfe5d7; border-radius: 16px; padding: 17px; }.review h3 { margin: 7px 0; }.review p { color: var(--muted); font-size: 12px; }.review-line { display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; margin: 8px 0 13px; border-top: 1px solid #cfe5d7; font-size: 11px; }
.confirmed { text-align: center; padding: 70px 10px 20px; }.check { display: grid; place-items: center; width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 50%; background: var(--mint); color: var(--green); font-size: 25px; }.confirmed h3 { font-size: 27px; }.confirmed dl { margin-top: 28px; text-align: left; }.confirmed dl div { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: 1px solid var(--line); }.confirmed dt { color: var(--muted); }.confirmed dd { margin: 0; font-weight: 700; text-align: right; }.error { color: var(--red); font-size: 12px; }
@media (max-width: 500px) { .service-grid, .slots { grid-template-columns: 1fr; } }
</style>
