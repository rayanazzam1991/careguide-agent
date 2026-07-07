import { z } from 'zod'
import { getAvailability } from '../../utils/repository'
import { ensureDemoSession } from '../../utils/session'

const querySchema = z.object({ serviceId: z.string(), providerId: z.string() })

export default defineEventHandler(async (event) => {
  ensureDemoSession(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid availability query' })
  return { slots: await getAvailability(event, [parsed.data.providerId], parsed.data.serviceId) }
})
