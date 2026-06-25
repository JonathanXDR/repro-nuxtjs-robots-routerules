# Repro: `@nuxtjs/robots@6.1.0` route rule type missing from the Nuxt 4 node typecheck context

Minimal Nuxt 4 project that triggers `TS2353` when declaring a `robots`
route rule in `nuxt.config.ts`. `@nuxtjs/robots@6.1.0` ships the
`NitroRouteConfig.robots` augmentation, but registers its
`nuxt-robots-nitro.d.ts` type template with `{ nitro: true, nuxt: true }`
and no `node: true`. In Nuxt 4 `nuxt.config.ts` is typechecked through
`.nuxt/tsconfig.node.json` / `.nuxt/nuxt.node.d.ts`, which references a
template only when it is registered with `node: true`. So the
augmentation never reaches the config typecheck and `routeRules.robots`
fails with TS2353.

> See [`ISSUE.md`](./ISSUE.md) for the bug-template writeup. An earlier,
> separate variant of this bug (the `future.compatibilityVersion === 4`
> gate) was fixed in `v6.0.9`. The `node: true` gap below is distinct and
> still reproduces on the latest `6.1.0`.

## Steps to reproduce

```bash
npm install
npm run typecheck
```

1. `postinstall` runs `nuxi prepare`, generating
   `.nuxt/types/nuxt-robots-nitro.d.ts` from the module.
2. `nuxi typecheck` fails:

   ```
   nuxt.config.ts(10,7): error TS2353: Object literal may only specify
     known properties, and 'robots' does not exist in type '{ cache?: ... }'.
         robots: false,
         ~~~~~~
   ```

## Expected behaviour

Declaring `routeRules['/api/**'] = { robots: false }` in `nuxt.config.ts`
typechecks under Nuxt 4 with the default `compatibilityVersion`.

## Actual behaviour

`TS2353` fires on the `robots` key because the `'nitropack/types'`
augmentation is skipped.

## Root cause

`node_modules/@nuxtjs/robots/dist/module.mjs` (v6.0.8):

```js
const isNuxt4 = nuxt.options.future?.compatibilityVersion === 4
addTypeTemplate({
  filename: 'types/nuxt-robots-nitro.d.ts',
  getContents: () =>
    isNuxt4
      ? `declare module 'nitropack' { … }
         declare module 'nitropack/types' { … }`
      : `declare module 'nitropack' { … }`,
})
```

The Nuxt config type system resolves `routeRules` through
`'nitropack/types'`. Sibling Nuxt SEO modules (`@nuxtjs/sitemap`,
`nuxt-og-image`, `nuxt-security`) augment both module specifiers
unconditionally. Robots is the outlier that gates the second one on a
flag that most Nuxt 4 projects don't set.

The fix in v6.0.9 (PR #300) replaces the
`future.compatibilityVersion === 4` check with `@nuxt/kit`'s
`isNuxtMajorVersion(4, nuxt)`, which reads the installed Nuxt version
directly.

## Related upstream activity

- Issue [`nuxt-modules/robots#299`](https://github.com/nuxt-modules/robots/issues/299), original bug report (closed).
- PR [`#295`](https://github.com/nuxt-modules/robots/pull/295), *"fix: augment NitroRouteConfig on both nitropack module paths"* (merged, but gated the second augmentation behind the unreliable flag that #300 then replaced).
- PR [`#300`](https://github.com/nuxt-modules/robots/pull/300), *"fix(types): broken nuxt v4 check"* (merged, ships the actual fix).
- Earlier PR [`#212`](https://github.com/nuxt-modules/robots/pull/212), *"fix(module): declare module `nitropack/types`"* (merged).

## Environment

- `nuxt@4.4.6`
- `@nuxtjs/robots@6.0.8` *(this repro)* / `@nuxtjs/robots@>=6.0.9` *(fixed)*
- `typescript@6.0.3`
- Node.js ≥ 20.19

## Follow-up: still reproduces on 6.1.0

`@nuxtjs/robots@6.1.0` (latest as of 2026-06-12) added the
`declare module 'nitropack/types'` augmentation from issue #299, but
`npm run typecheck` in this repro still fails with the same TS2353.

The remaining gap: the module registers its type template via
`addTypeTemplate(..., { nitro: true, nuxt: true })` without
`node: true` (see `registerTypeTemplates` in `dist/module.mjs`), so the
generated `.nuxt/types/nuxt-robots-nitro.d.ts` is never referenced from
`.nuxt/nuxt.node.d.ts`, the context that typechecks `nuxt.config.ts`.

User-side workaround until upstream adds `node: true`:

```ts
// nuxt.config.ts
hooks: {
  'prepare:types'({ nodeReferences }) {
    nodeReferences.push({ path: 'types/nuxt-robots-nitro.d.ts' })
  },
},
```
