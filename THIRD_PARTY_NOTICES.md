# Third-Party Notices

## Rapier

- **Package:** `@dimforge/rapier3d-compat`
- **Version:** `0.20.0`
- **Source:** https://github.com/dimforge/rapier (npm `@dimforge/rapier3d-compat@0.20.0`)
- **Vendored file:** `vendor/rapier.js` — copied from `node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs` (compat build, base64-inlined WASM, no CDN, relative importmap `rapier` → `./vendor/rapier.js`)
- **License:** Apache-2.0 — see `vendor/rapier.LICENSE` and upstream notices

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
   ... (full text in vendor/rapier.LICENSE and node_modules/@dimforge/rapier3d-compat/LICENSE)
```

See also:
- `vendor/README.md` for vendoring details and runtime path (Three.js + Rapier)
- `vendor/rapier.LICENSE` for Apache-2.0 full text

---

## Three.js

- **Package:** `three`
- **Version:** `0.160.0`
- **Source:** https://github.com/mrdoob/three.js (npm `three@0.160.0`)
- **Vendored file:** `vendor/three.module.js` — copied from `node_modules/three/build/three.module.js` (no CDN, relative importmap `three` → `./vendor/three.module.js`)
- **Vendored addons:** `vendor/addons/GLTFLoader.js`, `vendor/addons/SkeletonUtils.js` — copied unchanged from `node_modules/three/examples/jsm/` for local GLB loading/skinned cloning
- **License:** MIT

```
The MIT License

Copyright © 2010-2023 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

See also:
- `vendor/README.md` for vendoring details and runtime path
- `vendor/three.module.js` header for the upstream license header
- `node_modules/three/LICENSE` (installed locally, not shipped in submission ZIP)
