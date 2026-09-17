# Cinderjaw — revised pre-build attachment plan

This supersedes V1 only for the four upper limb attachments. All twelve plates,
unchanged components, construction operations, budgets and evidence gates from
`anatomy-plan-v1.md` remain. Consume the frozen `anatomy-plan-v2.json` arrays.
No model has yet been built; these are planning revisions.

The first reviewer correctly held attachment proof, but a top-surface height
alone did not show a gap beneath the body. Root's complete shell audit found
the real issue: several outer upper-ring vertices missed the torso footprint
or fell outside a thin side interval. The limb centres already overlapped the
body. `v1-upper-ring-volume.json` preserves that distinction and failure.

V2 moves upper centres inward to X±0.4, Z0.23 for front and -0.46 for rear;
upper radii are 0.16m transverse and 0.18m longitudinal. For every eight-point
upper ring, actual double-sided torso triangle rays establish the bottom and
top shell intersections. The entire horizontal cap sits inside their common
interior interval. Final cap Y is 0.61833/0.61063 front and 0.46960/0.47114 rear.
Small asymmetry follows the retained seven-sided body. Every cap vertex has at
least 0.12488m top burial and 0.15263m overlap above the lower shell. These are
actual full-footprint interior tests, not just a bounding box.

The lower/knee centres and radii remain. The revised upper centres recompute
middle section planes, segment lengths, bend angles and all24vertices perleg:
front bends66.23/66.66degrees, rear92.18/92.00degrees. Changed parts remain
inside the original species envelope. Builder must report actual volume,
closure, contacts and neutral images; numeric attachment does not pass visual
likeness by itself.
