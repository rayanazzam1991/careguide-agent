export default defineNuxtRouteMiddleware(async (to) => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const session = await $fetch<{ authenticated: boolean }>('/api/auth/session', { headers }).catch(() => ({ authenticated: false }))
  if (to.path === '/login') {
    if (session.authenticated) return navigateTo('/')
    return
  }
  if (!session.authenticated) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
