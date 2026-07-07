import { getOpsRuns } from '../../utils/repository'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }).safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid pagination query' })
  const query = parsed.data
  return { page: query.page, pageSize: query.pageSize, ...await getOpsRuns(event, query.page, query.pageSize) }
})
