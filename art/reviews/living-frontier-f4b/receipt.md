# F4B body-tone readability receipt

## Selected result

R2 is selected: the unchanged Mossling V3 textured body uses the existing shared whole-body tint path at strength `0.78`. It makes lichen cooler green-gray and clay warmer across the same painted body while retaining texture and lighting variation. The same expression path applies to wild creatures, followers, and the staged young; materials remain instance-owned and the existing disposal and rig paths remain unchanged.

R1 scored **7.2 HOLD** because it was too close to baseline. R2 scored **8.1 PASS** (composition 2.4, lighting 2.2, material 2.7, detail 0.8). No R3 was run.

## Fixtures and captures

`baseline.png`, `r1.png`, and `r2.png` are neutral one-off 900×600 pair renders using locally loaded actual Mossling V3 models, fixed Idle at 0.4 seconds, and scale 0.7. `target.png` is the generated1537×1023 material target edited from that actual baseline; it is not gameplay evidence. No extra requestAnimationFrame loop was added. `r2-camp.png` is the actual nursery resident at gameplay scale: a309×687 capture from a412×915 portrait emulation. That small gameplay scale remains the visible limitation.

## Scope and limits

V3 has one material shared by the painted body, foliage, and flowers, so the selected tint shifts all of them together. It does not create a semantic texture mask or alter geometry. Eyes, shape/size, markings, crest, and tail traits remain data-only and are not presented as visible expression.

Focused source proof: `node --test tests/wildkinAppearance.test.js` passed5/5, covering lichen/clay distinction, eye invisibility for V3, material ownership, borrowed texture preservation, and disposal. Final integrated1,131/1,131 tests, verify/world/campaign/build/validate/ZIP PASS;44.10MB unpacked/20.53MB ZIP. The portable build imported the isolated four-individual save then literally reloaded, retained exact body-tone records and the active lichen follower, resumed the outing at health5 and completed native Jump. Shared package proof and portrait capture are in the F1B receipt. No physical-phone or new motion-admission claim.
