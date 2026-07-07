<template>
  <div :class="{ 'site-shell': !isLoginPage }">
    <slot v-if="isLoginPage" />
    <template v-else>
    <header class="site-header">
      <NuxtLink class="brand" to="/" aria-label="CareGuide home">
        <span class="brand-mark">C</span>
        <span>CareGuide</span>
      </NuxtLink>
      <nav aria-label="Primary navigation">
        <NuxtLink to="/">Book</NuxtLink>
        <NuxtLink to="/ops">Agent health</NuxtLink>
        <NuxtLink to="/case-study">Case study</NuxtLink>
      </nav>
      <div class="header-actions">
        <span class="demo-pill"><span /> Synthetic demo</span>
        <button class="logout-button" type="button" @click="logout">Sign out</button>
      </div>
    </header>
    <main>
      <slot />
    </main>
      <footer class="site-footer">
        <span>CareGuide is a product concept, not a healthcare provider.</span>
        <span>Do not enter real personal or medical information.</span>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<style scoped>
.header-actions { justify-self: end; display: flex; align-items: center; gap: 10px; }
.logout-button { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-weight: 700; padding: 9px; }
</style>
