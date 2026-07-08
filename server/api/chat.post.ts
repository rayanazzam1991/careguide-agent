import { randomUUID } from 'node:crypto'
import { createOpenAI, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import { createBookingTools } from '../ai/tools'
import { BOOKING_AGENT_PROMPT } from '../ai/prompt'
import { detectDeterministicGuardrail, detectSafetyBoundary, deterministicGuardrailMessage, safetyMessage } from '../utils/safety'
import { ensureDemoSession, hashIdentity } from '../utils/session'
import { recordRun, recordSafetyEvent } from '../utils/repository'
import { staticAssistantResponse } from '../utils/stream'
import { getServerSupabase, hasSupabaseConfig } from '../utils/supabase'
import { getCareGuideConfig } from '../utils/config'

const bodySchema = z.object({ messages: z.array(z.unknown()).min(1).max(40) })

function lastUserText(messages: UIMessage[]): string {
  const message = [...messages].reverse().find(item => item.role === 'user')
  return message?.parts.filter(part => part.type === 'text').map(part => part.text).join(' ').slice(0, 4000) ?? ''
}

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid chat request' })

  const messages = parsed.data.messages as UIMessage[]
  const latestText = lastUserText(messages)
  const boundary = detectSafetyBoundary(latestText)
  const deterministicGuardrail = boundary ? null : detectDeterministicGuardrail(latestText)
  const config = getCareGuideConfig(event)
  const { hash: sessionHash } = ensureDemoSession(event)

  if (hasSupabaseConfig(event)) {
    const client = getServerSupabase(event)
    const ipHash = hashIdentity(getRequestIP(event, { xForwardedFor: true }) || 'unknown', event)
    const [sessionLimit, ipLimit] = await Promise.all([
      client.rpc('check_rate_limit', { p_identity_hash: sessionHash, p_limit: 20 }),
      client.rpc('check_rate_limit', { p_identity_hash: ipHash, p_limit: 60 }),
    ])
    if (sessionLimit.error || ipLimit.error || !sessionLimit.data || !ipLimit.data) throw createError({ statusCode: 429, statusMessage: 'Too many agent requests. Try again in a minute.' })
  }

  if (boundary) {
    await recordSafetyEvent(event, sessionHash, boundary)
    await recordRun(event, { id: randomUUID(), status: 'safety', toolSequence: ['safetyBoundary'], latencyMs: Date.now() - startedAt, model: 'deterministic', promptVersion: 'safety-v1', createdAt: new Date().toISOString() }, sessionHash)
    return staticAssistantResponse(safetyMessage(boundary))
  }

  if (deterministicGuardrail) {
    await recordRun(event, { id: randomUUID(), status: 'completed', toolSequence: [`guardrail:${deterministicGuardrail}`], latencyMs: Date.now() - startedAt, model: 'deterministic', promptVersion: 'guardrail-v1', createdAt: new Date().toISOString() }, sessionHash)
    return staticAssistantResponse(deterministicGuardrailMessage(deterministicGuardrail))
  }

  if (!config.openaiApiKey) {
    await recordRun(event, { id: randomUUID(), status: 'completed', toolSequence: ['demoFallback'], latencyMs: Date.now() - startedAt, model: 'deterministic', promptVersion: config.promptVersion, createdAt: new Date().toISOString() }, sessionHash)
    return staticAssistantResponse('The live model is disabled in this local demo, but the booking workspace is fully functional. Choose a service on the right and I’ll keep the flow clear. In production, this same interface streams OpenAI tool calls through the Vercel AI SDK.')
  }

  const openai = createOpenAI({ apiKey: config.openaiApiKey })
  const tools = createBookingTools(event, sessionHash)
  const result = streamText({
    model: openai.responses(config.openaiModel),
    system: BOOKING_AGENT_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
    maxOutputTokens: 900,
    timeout: { totalMs: 45_000 },
    providerOptions: {
      openai: {
        store: false,
        parallelToolCalls: false,
        reasoningEffort: 'low',
        textVerbosity: 'medium',
        safetyIdentifier: sessionHash,
      } satisfies OpenAIResponsesProviderOptions,
    },
    async onFinish({ steps, usage }) {
      const sequence = steps.flatMap(step => step.toolCalls.map(call => call.toolName))
      await recordRun(event, {
        id: randomUUID(), status: sequence.includes('requestHandoff') ? 'handoff' : 'completed', toolSequence: sequence,
        latencyMs: Date.now() - startedAt, model: config.openaiModel, promptVersion: config.promptVersion,
        inputTokens: usage.inputTokens, cachedInputTokens: usage.inputTokenDetails.cacheReadTokens,
        outputTokens: usage.outputTokens, createdAt: new Date().toISOString(),
      }, sessionHash)
    },
  })

  return result.toUIMessageStreamResponse({
    headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
    onError: () => 'The agent could not complete that step. Your slot and personal data remain safe; please retry or request a handoff.',
  })
})
