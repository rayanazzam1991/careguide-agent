import { z } from 'zod'
import { holdSlot } from '../../utils/repository'
import { ensureDemoSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const parsed = z.object({ slotId: z.string().min(1).max(160) }).safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'A valid slot is required' })
  const body = parsed.data
  const session = ensureDemoSession(event)
  return await holdSlot(event, session.hash, body.slotId)
})
