export type Modality = 'online' | 'in-person'

export interface ServiceCard {
  id: string
  slug: string
  name: string
  description: string
  durationMinutes: number
  priceCents: number
  accent: string
}

export interface ProviderCard {
  id: string
  name: string
  title: string
  bio: string
  languages: string[]
  modalities: Modality[]
  serviceIds: string[]
  initials: string
}

export interface AvailabilitySlot {
  id: string
  providerId: string
  serviceId: string
  locationId: string
  modality: Modality
  startsAt: string
  endsAt: string
}

export interface SlotHold {
  id: string
  slotId: string
  expiresAt: string
  status: 'active' | 'released' | 'confirmed' | 'expired'
}

export interface BookingConfirmation {
  reference: string
  providerName: string
  serviceName: string
  startsAt: string
  modality: Modality
  locationName: string
}

export interface OpsSummary {
  completionRate: number
  handoffRate: number
  safetyEvents: number
  p95LatencyMs: number
  toolSuccessRate: number
  evalPassRate: number
  workerHealthy: boolean
  activeSessions: number
  totalTokens: number
  estimatedCostUsd: number
}

export interface OpsRun {
  id: string
  status: 'completed' | 'handoff' | 'safety' | 'failed'
  toolSequence: string[]
  latencyMs: number
  model: string
  promptVersion: string
  createdAt: string
  inputTokens?: number
  cachedInputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number | null
}
