# Skydancer R2 wing-only repair plan

R1 is held because its mechanically valid wings read as narrow horizontal loaves and its three cover plates merge. This proposal changes only the two primary wings and their existing three plates per side. Every R1 leg, foot, toe, protected component, sibling, metadata, collision, placement, and gameplay value is retained exactly.

The literal data widens the outer primary wing from x `.86` to `1.05` and lowers its tip center from y `1.12` to `.82`. The three existing plate tips now step at x `.88/.98/1.08` and distinct y bands `1.28–1.38`, `.93–1.18`, `.75–1.02`. At the locked neutral-frame scale this predicts adjacent front gaps of `4.55/7.27 px` at 96 px and `2.27/3.64 px` at 48 px. These are explicit readability targets, not a claim that three parts alone form three visible layers.

The wing/plate topology remains exactly 192 triangles: two 60-triangle closed wings and six 12-triangle plates. With the R1-exact legs, feet, toes and protected parts retained, the predicted total stays at the observed R1 879 triangles. The changed wing/plate bounds `x ±1.08, y .75–1.54, z -.86–.19` remain inside the frozen authoring envelope.

Before any source build, a reviewer must run the literal torso-shell +Y bracket for every unchanged wing root-cap vertex and the literal primary-wing +X bracket for every plate root face. Both tests must prove a lower surface and upper surface around every vertex; a center-only overlap does not pass. Then review front, side, three-quarter, 48 px, and 96 px against the stated projected separation table.
