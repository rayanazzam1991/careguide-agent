import { getAuthenticatedUser, isAuthEnabled } from '../../utils/auth'
import { getCareGuideConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!isAuthEnabled(event)) return { authenticated: true, authEnabled: false, username: null }
  const username = getAuthenticatedUser(event)
  return {
    authenticated: Boolean(username),
    authEnabled: true,
    username: username ? getCareGuideConfig(event).authUsername : null,
  }
})
