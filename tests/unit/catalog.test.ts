import { describe, expect, it } from 'vitest'
import { makeAvailability, providers, services } from '../../server/utils/catalog'

describe('synthetic catalog', () => {
  it('contains the planned catalog', () => {
    expect(services).toHaveLength(4)
    expect(providers).toHaveLength(6)
    expect(providers.every(provider => provider.serviceIds.every(id => services.some(service => service.id === id)))).toBe(true)
  })

  it('produces valid future availability', () => {
    const slots = makeAvailability()
    expect(slots.length).toBeGreaterThan(20)
    expect(slots.every(slot => new Date(slot.endsAt) > new Date(slot.startsAt))).toBe(true)
    expect(new Set(slots.map(slot => slot.id)).size).toBe(slots.length)
  })
})
