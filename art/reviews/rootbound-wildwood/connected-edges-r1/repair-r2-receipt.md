# Connected edges R1 — four-ID focused repair receipt

This is the only post-review repair. It changes the first four Gallery records; the other ten additive records and all prior 43 Rootbound records remain byte-for-byte preserved in source.

| key | R1 | repair transform |
|---|---|---|
| `edge-gallery-west-01` | `(-485.5,625)` | `(-484.6,625)`, scale `3.3`, yaw `.30` |
| `edge-gallery-east-01` | `(-470.4,630)` | `(-472.5,630)`, scale `3.25`, yaw `-.32` |
| `edge-gallery-west-02` | `(-486,646.5)` | `(-483,652)`, scale `3.55`, yaw `.18` |
| `edge-gallery-east-02` | `(-470,644.5)` | `(-471.5,650)`, scale `3.3`, yaw `-.28` |

The recalculated receipt retains all 14 selected edge records: **57/57** curated Rootbound records. Full transformed visual envelopes retain the approved main-lane 2 m and optional-lane 1.5 m centreline clearances; selector-sized support, forage-centre, and Trailgloam disk checks remain true. No collider, terrain, wildlife, asset, or selector change was made.

Focused verification: `node --test tests/rootboundCircuit.test.js` — **8/8 pass**.

Native capture remains the sole visual acceptance gate; this confirms only the four deliberate coordinates and source admission.

## Repair hashes

| file | SHA-256 |
|---|---|
| `src/world/frontierRootbound.js` | `f04b6c3aa3715e853b6868ebaacfb866987e0f44e08388d9beee5116ede1506c` |
| `tests/rootboundCircuit.test.js` | `04a52c284f39b961d68b7d240e41d2d40246dbc579a4d4c2b5260fbb8b92cc81` |
| `plan-support-clearance.json` | `e2d2cc8b287d4dcb1bc270cba6c49aa0d15742d35f07471abd68726f02f443db` |

## Root verification correction

The earlier receipt accidentally evaluated the R1 literal plan rather than repaired source. `repair-support-clearance.mjs` now reads the actual production curated records. It found east02 at(-471.5,650) only1.518m from the main centerline; root moved it0.6m east to(-470.9,650). All actual repaired envelopes now pass, minimum main2.075m/branch3.538m. Its intentional overlap with existing gallery-east-rib forms one root/leaf cluster; only that named pair joins the existing close-cluster test allowance. No collider or gate change. Use repair-support-clearance.json for final measurements, not the historical R1 plan receipt/hashes above.
