export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: '',
    openaiModel: 'gpt-4.1-mini',
    supabaseSecretKey: '',
    supabaseDatabaseUrl: '',
    sessionSecret: '',
    hashingSalt: '',
    authUsername: '',
    authPassword: '',
    promptVersion: 'booking-agent-v1',
    workerToken: '',
    public: {
      appOrigin: 'http://localhost:3000',
      demoMode: true,
      supabase: {
        url: '',
        key: '',
      },
    },
  },
  nitro: {
    preset: 'node-server',
    compressPublicAssets: true,
    routeRules: {
      '/api/chat': { cors: false },
      '/api/ops/**': { cache: { maxAge: 15 } },
    },
  },
  app: {
    head: {
      titleTemplate: '%s · CareGuide',
      meta: [
        { name: 'description', content: 'A production-shaped AI healthcare booking agent using synthetic data.' },
        { name: 'theme-color', content: '#102d27' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700&display=swap' },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
