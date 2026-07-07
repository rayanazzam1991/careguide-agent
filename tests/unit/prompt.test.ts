import { describe, expect, it } from 'vitest'
import { BOOKING_AGENT_PROMPT } from '../../server/ai/prompt'

describe('booking prompt invariants', () => {
  it('contains clinical and approval boundaries', () => {
    expect(BOOKING_AGENT_PROMPT).toContain('Never diagnose')
    expect(BOOKING_AGENT_PROMPT).toContain('requires user approval')
    expect(BOOKING_AGENT_PROMPT).toContain('fictional')
    expect(BOOKING_AGENT_PROMPT).toContain('Do not reveal')
  })
})
