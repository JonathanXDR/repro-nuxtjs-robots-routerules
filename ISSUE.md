# 🐛 The bug

Declaring a `robots` route rule in `nuxt.config.ts` fails typecheck on a default Nuxt 4 project. `@nuxtjs/robots@6.1.0` ships the `NitroRouteConfig.robots` augmentation, but the type template that carries it never reaches the context that typechecks `nuxt.config.ts`, so `nuxi typecheck` reports TS2353.

```
nuxt.config.ts:10:7 - error TS2353: Object literal may only specify known properties, and 'robots' does not exist in type '{ cache?: false | { name?: string | undefined; ... } | undefined; ... }'.

10       robots: false,
               ~~~~~~
```

The same `robots` key works fine inside the app/server context (`defineRouteRules`, page meta). It only breaks in `nuxt.config.ts`.

# 🛠️ To reproduce

https://stackblitz.com/github/JonathanXDR/repro-nuxtjs-robots-routerules

# 🌈 Expected behavior

`routeRules['/api/**'] = { robots: false }` in `nuxt.config.ts` typechecks under Nuxt 4 with the default `compatibilityVersion`, the same way the sibling Nuxt SEO modules (`@nuxtjs/sitemap`, `nuxt-og-image`) augment their route rules.

# ℹ️ Additional context

Root cause is in `registerTypeTemplates` in the module build. The `nuxt-robots-nitro.d.ts` template, which holds the `interface NitroRouteConfig { robots?: ... }` augmentation, is registered without `node: true`:

```js
// node_modules/@nuxtjs/robots/dist/module.mjs:99-118 (v6.1.0)
addTypeTemplate({
  filename: "types/nuxt-robots-nitro.d.ts",
  getContents: () => `... declare module 'nitropack/types' { interface NitroRouteConfig { robots?: ... } } ...`
}, {
  nitro: true,
  nuxt: true,
  // missing: node: true
});
```

In Nuxt 4, `nuxt.config.ts` is typechecked through `.nuxt/tsconfig.node.json`, which includes only `.nuxt/nuxt.node.d.ts`. A type template is referenced from `nuxt.node.d.ts` only when it is registered with `node: true`:

```js
// node_modules/@nuxt/kit/dist/index.mjs:1226-1228
if (context?.node) nuxt.hook("prepare:types", (payload) => {
  payload.nodeReferences ||= [];
  payload.nodeReferences.push({ path: template.dst });
});
```

Because robots omits `node: true`, `nuxt-robots-nitro.d.ts` is referenced only from `.nuxt/nuxt.d.ts` (app context) and never from `.nuxt/nuxt.node.d.ts`, so the `NitroRouteConfig.robots` augmentation is invisible to the config typecheck. Verified in the repro: `grep nuxt-robots-nitro .nuxt/nuxt.node.d.ts` returns nothing, while `.nuxt/nuxt.d.ts` does reference it.

Adding `node: true` to that `addTypeTemplate` call fixes it. As a user-side workaround until then:

```ts
// nuxt.config.ts
hooks: {
  'prepare:types'({ nodeReferences }) {
    nodeReferences.push({ path: 'types/nuxt-robots-nitro.d.ts' })
  },
},
```

Environment: `nuxt@4.4.6`, `@nuxtjs/robots@6.1.0`, `typescript@6.0.3`, `vue-tsc@3.3.2`, Node 24. The repro runs in StackBlitz with no native dependencies.
