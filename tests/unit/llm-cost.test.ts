import { describe, expect, it } from 'vitest'
import { estimateLlmCostUsd } from '../../server/utils/llm-cost'

describe('LLM cost estimation', () => {
  it('prices uncached, cached, and output tokens separately', () => {
    expect(estimateLlmCostUsd('gpt-5.4-mini', { inputTokens: 1_000_000, cachedInputTokens: 200_000, outputTokens: 100_000 })).toBeCloseTo(1.065)
  })

  it('returns null when pricing has not been configured', () => {
    expect(estimateLlmCostUsd('future-model', { inputTokens: 100 })).toBeNull()
  })
})
