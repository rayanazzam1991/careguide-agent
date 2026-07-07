<script setup lang="ts">
useHead({ title: 'Sign in' })

const route = useRoute()
const username = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

async function login() {
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { username: username.value, password: password.value } })
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    await navigateTo(redirect)
  } catch {
    errorMessage.value = 'The username or password is incorrect.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card panel">
      <NuxtLink class="brand" to="/" aria-label="CareGuide home">
        <span class="brand-mark">C</span><span>CareGuide</span>
      </NuxtLink>
      <div>
        <span class="eyebrow">Private workspace</span>
        <h1>Welcome back.</h1>
        <p>Sign in to access the CareGuide booking workspace.</p>
      </div>
      <form @submit.prevent="login">
        <label>Username<input v-model="username" name="username" autocomplete="username" required autofocus></label>
        <label>Password<input v-model="password" name="password" type="password" autocomplete="current-password" required></label>
        <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>
        <button class="button button-primary" type="submit" :disabled="pending">{{ pending ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 32px; }
.login-card { width: min(460px, 100%); padding: clamp(28px, 6vw, 48px); display: grid; gap: 38px; }
.login-card h1 { font-size: clamp(40px, 8vw, 58px); margin-bottom: 10px; }
.login-card p { color: var(--muted); margin: 0; }
form { display: grid; gap: 18px; }
label { display: grid; gap: 8px; font-size: 13px; font-weight: 700; }
input { width: 100%; border: 1px solid var(--line); border-radius: 13px; padding: 13px 14px; color: var(--ink); background: white; outline: none; }
input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(13, 108, 83, .12); }
.login-error { color: var(--red); font-size: 13px; }
.button { width: 100%; margin-top: 4px; }
</style>
