# Rootbound restart R3 — feasibility and rollback receipt

**Decision:** HOLD and rollback to the retained restart-R2 source. This was the
third and final authorized habitat pass; no further habitat production follows
from this receipt.

## Candidate method

R3 replaced the retained low Lantern bank with one camera-facing crescent:
`(-451,681) → (-448,683) → (-444,684) → (-440,684) → (-436,683)`. The
candidate was widened to 7 m and reduced to a 0.32 m rise after its first,
steeper version failed.

It still crossed the proven Gallery-to-Destination approach and invalidated
the scenery placement surface. In the candidate source, centered one-metre
height-difference slopes measured approximately:

- `(-450.076, 688.099)`: `0.485`
- `(-450, 686)`: `0.807`
- `(-450, 684)`: `0.724`

Curated Rootbound admission fell from 10 to 5 of the declared 10 records.
The failed records included the Lantern second ring and both thornstones, so
the candidate could not satisfy the intended two-edge room while retaining
the existing source and clearance contract.

## Final retained source

The crescent was removed and the retained R2 `lantern-bank` was restored
exactly: `(-440,682) → (-436,684) → (-433,686)`, width `4`, rise `1.35`.
No R3 candidate placement or clearance-rule change remains. The corrected
ordinary approach remains clear; its corresponding local slopes are:

- `(-450.076, 688.099)`: `0.050`
- `(-450, 686)`: `0.159`
- `(-450, 684)`: `0.201`

Focused `tests/rootboundCircuit.test.js` passed 5/5 after restoration. Final
SHA-256 source hashes:

- `src/world/frontierRootbound.js`: `1F585A3E19536AF43E2AD73ADECD1619989483703484D3BE1FB9E0BFF1C2354F`
- `src/world/frontierRegion.js`: `F4311070347484C907290E90169D5B395DE896AD6418F609072A478A3A25F04A`
- `src/world/frontierTerrain.js`: `3A0C5D36ABC08DBF47B40DC45617E61CE83E4202BD121E6880DD7230DD50601A`
- `src/world/frontierScenery.js`: `9DF09E658C70A3BC3653E4729ABD28FE2E500BC1C3527A7EB98162881CBDCC10`
- `tests/rootboundCircuit.test.js`: `CA9DA8520EA2522C3E36D6BD709BD27A54F4DD6081BF48D0B2F259EA6C693E2E`
