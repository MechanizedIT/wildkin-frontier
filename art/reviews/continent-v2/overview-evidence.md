# Bounded continent overview tool receipt

September 13, 2026. The production tool source is frozen before the 33-point continent outline integration. Root will generate the final comparison artifacts after that integration; this receipt does not present the former ellipse as the new outline.

## CLI

Generate the default full-continent overview from the repository root:

```powershell
node tools/inspect-frontier.mjs --overview
```

The default overview samples the explicit 8 km window `x=-4700…3300`, `z=-4900…3100` at `180×180`. This contains the geometry owner's final declared outline bounds `x=-3700…2300`, `z=-4400…2600` with an ocean margin.

Optional bounded controls:

```text
--seed <uint32|0xhex>
--center-x <number>
--center-z <number>
--extent <metres>
--extent-x <metres>
--extent-z <metres>
--resolution <samples-on-X-axis>
--output-dir <path>
```

Overview extents must each be 1,000–8,000 metres. Neither sampled axis may exceed 180 cells; an aspect ratio that derives more than 180 Z samples is rejected.

Default artifacts:

```text
.dream-loop/frontier-inspector/continent-overview.png
.dream-loop/frontier-inspector/continent-overview.svg
.dream-loop/frontier-inspector/continent-overview.json
```

The PNG is a 1,080-pixel nearest-neighbor rendering of the bounded terrain/coast grid. The SVG pairs terrain/coast with province blend and labels the current output as three implemented terrain grammars, not ten completed habitats. JSON records bounds, sample dimensions, approximate sampled land area, sampled land bounds, coast categories, terrain elevation, province weights, a stable measurement SHA-256, and the same scope label.

The existing local detailed command remains available without `--overview`; its default output stays `frontier-inspector.svg` and `frontier-inspector.json`.

## Source ownership guarantee

The overview path samples only:

```text
frontierContinent
frontierTerrain
frontierRegion-via-terrain
```

It returns before the tool dynamically imports the ecology, wildlife, and scenery modules used by the local detailed path. The overview report records `lifeEnumeration:false` and has no life counts or placement arrays. At the maximum grid it performs at most `180×180 = 32,400` overview cells; it never enumerates continent chunks.

## Focused proof

Test file:

```text
tests/frontierInspectorTool.test.js
```

Command and result:

```powershell
node --test tests/frontierInspectorTool.test.js
# 3 passed, 0 failed
```

The focused test runs the overview twice and checks byte-identical PNG, SVG, and JSON artifacts; verifies explicit bounds, source owners, three-grammar label, the 180-per-axis ceiling, and absence of life output; rejects 8,001 m extents, 181 samples, and an over-tall derived sample grid; and runs the unchanged detailed local path to confirm that its forage, wildlife, scenery, and placement report still exists.
