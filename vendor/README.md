# Vendor — Three.js + Rapier

This directory contains the **vendored** runtime dependencies. No CDN is used.

## Three.js

- **File:** `three.module.js`
- **Version:** `0.160.0` (`three@0.160.0`)
- **Origin:** `node_modules/three/build/three.module.js` after `npm install`
- **How vendored:** `npm install` then manual copy from `node_modules/three/build/three.module.js` to `vendor/three.module.js`. No modifications.
- **License:** MIT — see `../THIRD_PARTY_NOTICES.md` and the header comment in `three.module.js` itself. Full text also at `node_modules/three/LICENSE` when installed.

## Rapier

- **File:** `rapier.js`
- **Package:** `@dimforge/rapier3d-compat@0.20.0`
- **Origin:** `node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs` after `npm install` (compat build with base64-inlined WASM, no separate .wasm fetch)
- **How vendored:** `npm install @dimforge/rapier3d-compat@0.20.0` then copy `dist/rapier.mjs` → `vendor/rapier.js` (single file, ~2.8 MB). No modifications. The companion `rapier.LICENSE` is copied from the package LICENSE (Apache-2.0).
- **License:** Apache-2.0 — see `../THIRD_PARTY_NOTICES.md`, `vendor/rapier.LICENSE`, and `node_modules/@dimforge/rapier3d-compat/LICENSE`.

## Runtime usage

Imported via relative importmap in both dev and submission:

```html
<script type="importmap">
  { "imports": { "three": "./vendor/three.module.js", "rapier": "./vendor/rapier.js", "@dimforge/rapier3d-compat": "./vendor/rapier.js" } }
</script>
```

The submission builder (`tools/build-submission.mjs`) keeps `three` and `rapier` external (esbuild `external: ["three","rapier","@dimforge/rapier3d-compat"]`) and copies this directory verbatim to `dist/submission/vendor/`.
