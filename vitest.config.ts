import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    exclude: ['tests/e2e/**', 'node_modules/**', '.nuxt/**', '.output/**'],
    coverage: { reporter: ['text', 'lcov'], include: ['server/**/*.ts'] },
  },
})
