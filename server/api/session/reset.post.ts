import { ensureDemoSession } from '../../utils/session'
import { releaseSessionHolds } from '../../utils/repository'

export default defineEventHandler(async (event) => {
  const current = ensureDemoSession(event)
  await releaseSessionHolds(event, current.hash)
  ensureDemoSession(event, true)
  return { reset: true }
})
