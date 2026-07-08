export interface TokenUsage {
  inputTokens?: number
  cachedInputTokens?: number
  outputTokens?: number
}

interface ModelPricing {
  inputPerMillion: number
  cachedInputPerMillion: number
  outputPerMillion: number
}

// Standard API pricing in USD per 1M tokens, checked 2026-07-08.
const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5.4-mini': { inputPerMillion: 0.75, cachedInputPerMillion: 0.075, outputPerMillion: 4.5 },
  'gpt-4.1-mini': { inputPerMillion: 0.4, cachedInputPerMillion: 0.1, outputPerMillion: 1.6 },
}

export function estimateLlmCostUsd(model: string, usage: TokenUsage): number | null {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return null

  const input = Math.max(usage.inputTokens ?? 0, 0)
  const cached = Math.min(Math.max(usage.cachedInputTokens ?? 0, 0), input)
  const uncached = input - cached
  const output = Math.max(usage.outputTokens ?? 0, 0)

  return (uncached * pricing.inputPerMillion + cached * pricing.cachedInputPerMillion + output * pricing.outputPerMillion) / 1_000_000
}
