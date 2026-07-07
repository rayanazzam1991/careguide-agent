import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

export function staticAssistantResponse(text: string): Response {
  const id = crypto.randomUUID()
  return createUIMessageStreamResponse({
    headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: 'text-start', id })
        writer.write({ type: 'text-delta', id, delta: text })
        writer.write({ type: 'text-end', id })
      },
    }),
  })
}
