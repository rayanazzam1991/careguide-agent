import { z } from 'zod'
import { recordFeedback } from '../utils/repository'
import { ensureDemoSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  const { hash } = ensureDemoSession(event)
  const parsed = z.object({ value: z.enum(['positive', 'negative']) }).safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid feedback value' })
  const body = parsed.data
  await recordFeedback(event, hash, body.value)
  return { recorded: true }
})
