import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { confirmBooking } from '../../utils/repository'
import { ensureDemoSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const parsed = z.object({ holdId: z.string(), approved: z.literal(true), idempotencyKey: z.string().optional() }).safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Explicit approval and a valid hold are required' })
  const body = parsed.data
  const session = ensureDemoSession(event)
  return await confirmBooking(event, session.hash, body.holdId, body.idempotencyKey ?? randomUUID())
})
