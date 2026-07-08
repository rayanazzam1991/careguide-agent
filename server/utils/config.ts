import type { H3Event } from 'h3'

export interface CareGuideRuntimeConfig {
  openaiApiKey: string
  openaiModel: string
  supabaseSecretKey: string
  supabaseDatabaseUrl: string
  sessionSecret: string
  hashingSalt: string
  authUsername: string
  authPassword: string
  loginAlertWebhookUrl: string
  loginAlertEmail: string
  smtpUser: string
  smtpAppPassword: string
  promptVersion: string
  workerToken: string
  public: {
    appOrigin: string
    demoMode: boolean
    supabase: { url: string, key: string }
  }
}

export function getCareGuideConfig(event: H3Event): CareGuideRuntimeConfig {
  return useRuntimeConfig(event) as unknown as CareGuideRuntimeConfig
}
