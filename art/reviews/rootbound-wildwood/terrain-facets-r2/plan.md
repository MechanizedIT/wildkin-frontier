# Rootbound ground facets R2 — camera-facing fan comparison

**Status:** CPU/render-preview plan only. No game source, native browser, GPU, physics surface, support rule, resource, scenery, route, or persistence data has changed.

R1 answered a useful negative question: a broad low-amplitude sinusoidal shoulder made only a faint diagonal at the retained destination. This R2 compares one materially different shape language: a lane-preserving fan of **broad planar facets** with a restrained correlated floor tint. It follows the owner reference's visible low-poly floor logic—large readable planes with small tone shifts—without trying to add random normals or noise everywhere.

## Fixed evidence and preview field

The comparison uses R1's actual destination camera and its bounded rectangle:

- player (-449, 675), yaw -2.3, portrait pitch .62831853, effective distance 11.5910795 m, 52° FOV, 412×915 frame;
- R1 rectangle x[-454,-438], z[670,688], spanning the current 2 m grids in chunks (-10,13) and (-9,13);
- existing terrain main material is already flat shaded (src/world/frontierChunkRuntime.js). Its main frontier_ground material is constructed with the baked map but no vertexColors option (line 247), so current chunk RGB attributes are not visible through that material. R2 therefore tests actual mesh planes plus a new preview-only multiplier attribute, rather than a normal-only substitute or a claim that existing vertex RGB is active.

The camera-forward axis is (.7457,.6663) in X/Z and screen-right is (.6663,-.7457). The fan keeps a nominal central travel lane within |side| <= 1.65 m at zero added height, then fades over 1.1 m into two side planes. Its outer rectangle fades to exact zero over 2 m. This keeps the comparison local; it does **not** certify that the nominal lane is currently safe after a real terrain edit.

## One changed-method candidate

parameters.json defines a low raised camera-left shoulder and a low recessed camera-right shoulder, each sloping gently along the route direction. The effect is a three-plane floor: retained center lane, low left plane, low right plane. It avoids the R1 two-wave pattern and avoids all-over noise.

The CPU script reads current Float32 vertices from both actual chunks and reports:

| Measured item | Result |
| --- | --- |
| selected mesh vertices / triangles | 90 / 144 |
| changed vertices | 32; all outer-boundary deltas are exactly zero |
| candidate delta | -0.261..+0.348 m |
| added normal rotation | 0..12.48°, mean 3.08° |
| in-frame changed vertices | 8; 4 lie inside the provisional useful portrait rectangle |
| vertical projection movement | 0.84..15.46 px, mean 10.79 px |
| preview multiplier range | 0.945..1.055, with exact white outside the fan |
| current query-minus-mesh baseline | max 4.71e-7 m |

The current absolute triangle slope reaches 46° in this field. That is a baseline terrain fact, not a claim that the candidate is traversable. It is why the future authoritative pass must use final rendered triangle and full player-footprint evidence rather than this preview math.

Visible changed vertices concentrate around roughly screen (55..360, 267..382), with a lower left edge point at (19,478). That places the comparison beside the player-to-lantern threshold rather than behind the camera or exclusively under the HUD. The terrain fan must be judged from a matching native A/B capture; numerical screen displacement is a candidate-selection signal, not proof of perceptual gain.

## Preview versus authoritative integration

The next private render comparison can apply the computed vertex deltas only to cloned current chunk buffers. It must preserve the native 2 m index arrays, flatShading, lighting and camera. For color it clones the existing main material, retains its baked map, enables vertexColors, and supplies a **fresh white-identity multiplier** attribute: [1,1,1] outside the fan and the computed 0.945..1.055 multiplier inside it. It must not pass the current sampled terrain RGB attribute through that mapped material, which would multiply the baked palette twice. This is renderer-only:

- sampleFrontier, sampleFrontierHeight, physics terrain surfaces, scenery grounding, resource/home selection and save identities remain baseline;
- the preview cannot establish collision, contact, route, color persistence or ecology correctness.

If that native A/B is visibly useful, the already-authorized later source pass must place the same **single final term** in Rootbound's authoritative height/color chain. The likely owners to review together are:

1. src/world/frontierRootbound.js — bounded Rootbound feature/profile and existing life-preservation fade;
2. src/world/frontierRegion.js — default-world Rootbound profile admission;
3. src/world/frontierTerrain.js — the shared sampleFrontierRaw height and ground-color path feeding both mesh and query; and
4. src/world/frontierChunkRuntime.js — existing mesh/physics lifecycle and baked texture sampling, which should consume the same final sample rather than a visual-only height override.

No normal API is proposed. The mesh remains flat shaded, so triangle normals remain faceted; vertex color is still interpolated across each triangle and is not a flat per-face color. Correlated color is deliberately a small multiplicative offset (+[.035,.055,.020] at full raised weight and the inverse at the recessed side), tied only to the same local fan—not new texture noise.

## Required gates before source integration

A future implementation must show all of the following after the final post-mask term, using the unchanged 2 m triangles:

- shared query and chunk-vertex heights agree at every changed vertex and all untouched vertices retain baseline values;
- full .32 m player-footprint sampling across the real route corridor and the fan's lane/edge shows acceptable final slope and support;
- every protected Rootbound resource/home footprint, complete curated visual/collider hull, existing Lantern log/rings/thorn supports, and surrounding admission source remains valid or is left outside the term;
- default-world-only gating and alternate-world neutrality remain exact; and
- native matching portrait A/B and normal input establish that the visual gain is worth the support audit.

This is intentionally one comparison, not a reusable terrain framework or another habitat pass.

