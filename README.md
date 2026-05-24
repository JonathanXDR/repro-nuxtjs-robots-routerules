# Repro: `@nuxtjs/robots` route rule augmentation missing on `nitropack/types`

Minimal Nuxt 4 project that triggers `TS2353` when declaring a `robots` route rule in `nuxt.config.ts`.

## What you should see

On boot, StackBlitz runs `npm run typecheck` and fails with:

```
nuxt.config.ts: TS2353: Object literal may only specify known properties,
and 'robots' does not exist in type '{ cache?: ... }'.
      robots: false,
      ~~~~~~
```

## Why it fails

`@nuxtjs/robots` only augments `declare module 'nitropack'`. The Nuxt config type system resolves `routeRules` through `'nitropack/types'`. Sibling Nuxt SEO modules (`@nuxtjs/sitemap`, `nuxt-og-image`, `nuxt-security`) augment both module specifiers; robots is the outlier.

## Versions

- `nuxt@4.4.6`
- `@nuxtjs/robots@6.0.8`
