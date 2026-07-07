<template>
  <div class="site-shell">
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
      <span class="demo-pill"><span /> Synthetic demo</span>
    </header>
    <main>
      <slot />
    </main>
    <footer class="site-footer">
      <span>CareGuide is a product concept, not a healthcare provider.</span>
      <span>Do not enter real personal or medical information.</span>
    </footer>
  </div>
</template>
