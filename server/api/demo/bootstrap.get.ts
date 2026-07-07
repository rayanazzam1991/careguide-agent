import { locations, providers, services } from '../../utils/catalog'
import { ensureDemoSession } from '../../utils/session'

export default defineEventHandler((event) => {
  ensureDemoSession(event)
  return { services, providers, locations, demoPatient: { name: 'Alex Demo', email: 'alex.demo@example.invalid' } }
})
