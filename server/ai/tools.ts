import { randomUUID } from 'node:crypto'
import { tool } from 'ai'
import { z } from 'zod'
import type { H3Event } from 'h3'
import { confirmBooking, findProviders, getAvailability, holdSlot, releaseSessionHolds, requestHandoff, searchHelpContent, searchServices } from '../utils/repository'

export function createBookingTools(event: H3Event, sessionHash: string) {
  return {
    searchServices: tool({
      description: 'Search the approved CareGuide service catalog. Use before recommending a service.',
      strict: true,
      inputSchema: z.object({ query: z.string().max(120).default('') }),
      execute: async ({ query }) => ({ services: await searchServices(event, query) }),
    }),
    searchHelpContent: tool({
      description: 'Search approved operational help content. It contains no clinical advice.',
      strict: true,
      inputSchema: z.object({ query: z.string().min(2).max(120) }),
      execute: async ({ query }) => ({ articles: await searchHelpContent(event, query) }),
    }),
    findProviders: tool({
      description: 'Find fictional providers for a selected service and optional modality.',
      strict: true,
      inputSchema: z.object({ serviceId: z.string(), modality: z.enum(['online', 'in-person']).optional() }),
      execute: async ({ serviceId, modality }) => ({ providers: await findProviders(event, serviceId, modality) }),
    }),
    getAvailability: tool({
      description: 'Get current fictional availability for selected providers and service.',
      strict: true,
      inputSchema: z.object({ providerIds: z.array(z.string()).min(1).max(6), serviceId: z.string() }),
      execute: async ({ providerIds, serviceId }) => ({ slots: await getAvailability(event, providerIds, serviceId), timezone: 'Europe/Vienna' }),
    }),
    holdSlot: tool({
      description: 'Hold one selected slot for five minutes. This does not create a booking.',
      strict: true,
      inputSchema: z.object({ slotId: z.string() }),
      execute: async ({ slotId }) => await holdSlot(event, sessionHash, slotId),
    }),
    releaseSlot: tool({
      description: 'Release active holds when the user changes their mind.',
      strict: true,
      inputSchema: z.object({ reason: z.string().max(120).optional() }),
      execute: async () => {
        await releaseSessionHolds(event, sessionHash)
        return { released: true }
      },
    }),
    confirmBooking: tool({
      description: 'Confirm an active slot hold. This always requires explicit user approval.',
      strict: true,
      needsApproval: true,
      inputSchema: z.object({ holdId: z.string(), idempotencyKey: z.string().default(() => randomUUID()) }),
      execute: async ({ holdId, idempotencyKey }) => await confirmBooking(event, sessionHash, holdId, idempotencyKey),
    }),
    requestHandoff: tool({
      description: 'Create a fictional human-support handoff for operational help or clinical-boundary questions.',
      strict: true,
      inputSchema: z.object({ reason: z.enum(['schedule_help', 'accessibility', 'clinical_question', 'other']), summary: z.string().max(240) }),
      execute: async ({ reason, summary }) => await requestHandoff(event, sessionHash, reason, summary),
    }),
  }
}

export type BookingTools = ReturnType<typeof createBookingTools>
