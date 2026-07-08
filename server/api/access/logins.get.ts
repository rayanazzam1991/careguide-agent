import { listLoginEvents } from '../../utils/login-audit'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const events = await listLoginEvents(event)
  return { events, unread: events.filter(item => !item.acknowledgedAt).length }
})
