import type { AvailabilitySlot, ProviderCard, ServiceCard } from '../../app/types/careguide'

export const services: ServiceCard[] = [
  { id: 'srv-general', slug: 'general-practice', name: 'General practice', description: 'A first conversation for everyday health concerns and care coordination.', durationMinutes: 30, priceCents: 7900, accent: '#c7f0df' },
  { id: 'srv-derm', slug: 'dermatology', name: 'Dermatology', description: 'Appointments for skin, hair, and nail concerns without automated diagnosis.', durationMinutes: 30, priceCents: 10900, accent: '#f7d7c4' },
  { id: 'srv-physio', slug: 'physiotherapy', name: 'Physiotherapy', description: 'Movement-focused appointments with qualified physiotherapists.', durationMinutes: 45, priceCents: 11900, accent: '#d9e5fa' },
  { id: 'srv-nutrition', slug: 'nutrition', name: 'Nutrition consultation', description: 'Practical nutrition support with a registered professional.', durationMinutes: 45, priceCents: 9900, accent: '#f6e7ad' },
]

export const providers: ProviderCard[] = [
  { id: 'pro-anna', name: 'Dr. Anna Keller', title: 'General practitioner', bio: 'Calm, practical care with a focus on continuity.', languages: ['English', 'German'], modalities: ['online', 'in-person'], serviceIds: ['srv-general'], initials: 'AK' },
  { id: 'pro-jonas', name: 'Dr. Jonas Berger', title: 'General practitioner', bio: 'Patient-centered primary care and coordination.', languages: ['English', 'German'], modalities: ['online'], serviceIds: ['srv-general'], initials: 'JB' },
  { id: 'pro-mira', name: 'Dr. Mira Novak', title: 'Dermatologist', bio: 'Clear explanations and thoughtful dermatology care.', languages: ['English', 'German', 'Croatian'], modalities: ['online', 'in-person'], serviceIds: ['srv-derm'], initials: 'MN' },
  { id: 'pro-leo', name: 'Dr. Leo Hartmann', title: 'Dermatologist', bio: 'Evidence-based consultations in a relaxed setting.', languages: ['English', 'German'], modalities: ['in-person'], serviceIds: ['srv-derm'], initials: 'LH' },
  { id: 'pro-sara', name: 'Sara Lindner', title: 'Physiotherapist', bio: 'Movement plans built around everyday life.', languages: ['English', 'German'], modalities: ['in-person'], serviceIds: ['srv-physio'], initials: 'SL' },
  { id: 'pro-nora', name: 'Nora Weiss, MSc', title: 'Nutrition specialist', bio: 'Realistic, sustainable nutrition support.', languages: ['English', 'German'], modalities: ['online', 'in-person'], serviceIds: ['srv-nutrition'], initials: 'NW' },
]

export const locations = [
  { id: 'loc-online', name: 'Secure video visit' },
  { id: 'loc-josefstadt', name: 'Vienna · Josefstadt' },
  { id: 'loc-neubau', name: 'Vienna · Neubau' },
] as const

export const helpArticles = [
  { id: 'faq-demo', title: 'Is this a real healthcare service?', body: 'No. CareGuide is a synthetic product demonstration. Do not enter real personal or medical information.' },
  { id: 'faq-online', title: 'How do online visits work?', body: 'The demo confirmation includes a fictional secure-video location. No real call or patient record is created.' },
  { id: 'faq-cancel', title: 'Can I cancel?', body: 'Use Reset demo to release an active slot hold. Confirmed demo bookings are automatically removed after 24 hours.' },
]

function atViennaHour(dayOffset: number, hour: number): Date {
  const now = new Date()
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour - 2, 0, 0))
  return date
}

export function makeAvailability(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = []
  for (let day = 1; day <= 14; day += 1) {
    const weekday = atViennaHour(day, 9).getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    providers.forEach((provider, providerIndex) => {
      const serviceId = provider.serviceIds[0]!
      const modality = provider.modalities[(day + providerIndex) % provider.modalities.length]!
      const locationId = modality === 'online' ? 'loc-online' : (providerIndex % 2 ? 'loc-neubau' : 'loc-josefstadt')
      for (const hour of [9, 11, 14, 16]) {
        if ((day + hour + providerIndex) % 3 === 0) continue
        const starts = atViennaHour(day, hour)
        const duration = services.find(service => service.id === serviceId)?.durationMinutes ?? 30
        slots.push({
          id: `slot-${provider.id}-${day}-${hour}`,
          providerId: provider.id,
          serviceId,
          locationId,
          modality,
          startsAt: starts.toISOString(),
          endsAt: new Date(starts.getTime() + duration * 60_000).toISOString(),
        })
      }
    })
  }
  return slots
}
