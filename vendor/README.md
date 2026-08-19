# Vendor — Three.js

This directory contains the **vendored** Three.js module used at runtime. No CDN is used.

- **File:** `three.module.js`
- **Version:** `0.160.0` (`three@0.160.0`)
- **Origin:** `node_modules/three/build/three.module.js` after `npm install`
- **How vendored:** `npm install` then manual copy from `node_modules/three/build/three.module.js` to `vendor/three.module.js`. No modifications.
- **License:** MIT — see `../THIRD_PARTY_NOTICES.md` and the header comment in `three.module.js` itself. Full text also at `node_modules/three/LICENSE` when installed.
- **Runtime usage:** Imported via relative importmap in both dev and submission:

```html
<script type="importmap">
  { "imports": { "three": "./vendor/three.module.js" } }
</script>
```

The submission builder (`tools/build-submission.mjs`) keeps `three` external (esbuild `external: ["three"]`) and copies this directory verbatim to `dist/submission/vendor/`.
