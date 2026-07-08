import { acknowledgeLoginEvents } from '../../utils/login-audit'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  await acknowledgeLoginEvents(event)
  return { acknowledged: true }
})
