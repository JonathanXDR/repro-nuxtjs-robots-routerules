export default defineNuxtConfig({
  compatibilityDate: '2026-03-21',
  modules: ['@nuxtjs/robots'],

  // The whole point of the repro: declaring `robots` in routeRules.
  // Expected: typecheck passes.
  // Actual:   TS2353 — 'robots' does not exist in NitroRouteConfig.
  routeRules: {
    '/api/**': {
      robots: false,
    },
  },

  typescript: {
    typeCheck: true,
    strict: true,
  },
})
