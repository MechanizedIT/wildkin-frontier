# Sunscar weathered rib R3 — terminal independent review

**Status: HOLD; asset visit closed. No export or admission.** The final executed
source stopped at its pre-render structural gate, so there are no model views
to score and no GLB was produced.

The recorded input is still the frozen literal ring plan
`077016a80c180f55ee6fab77873270cd922af236415e00ae4e62448d4420189a`.
Closure, one-component, grounding, and envelope checks passed. The cap gate
did not: the left cap projected area matched but its winding test failed; the
right cap also failed winding and its absolute projected triangle sum
(0.9229321018) exceeded profile area (0.9224320950). The run correctly failed
before cap/studio rendering, so this is evidence of an invalid end-cap
construction, not an appearance failure.

The three permitted candidate passes are exhausted. Do not relax the area
threshold, reverse an expected sign after the fact, or run a fourth candidate.
The changed-method lesson for a later asset visit is to validate the exact
ordered end loops and cap triangulation in BMesh before a counted build: use a
known valid concave-polygon triangulation with its winding/union proof derived
from the generated triangles, then freeze that resulting topology. A prose
ring sequence plus assumed operator winding was insufficient here.
