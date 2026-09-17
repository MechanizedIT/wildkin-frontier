# Independent terminal diagnostic source review — GO

**Reviewed source:** `inspect-held-candidate.py` SHA-256 `bee8d9633102b5ead65f0ab904897740496c10b4909d3ad218211feda4629c72`.

**GO for the authorized read-only diagnostic.** The script binds the saved held blend and reviewed builder by hash, opens the blend, requires both existing mesh objects to have no modifiers, and records exact raw/R6 vertex-index signatures before and after. It measures graph components from existing loop triangles, labels the result explicitly as face-bearing vertex-connected components, and explicitly does not claim physical-solid or nesting evidence.

It calls only the previously reviewed shared-frame renderer, saves diagnostic outputs to a fresh absolute directory, and does not call a mesh edit, modifier, remesh, normal operation, export, or save operation. Its input blend hash is rechecked after rendering. Resource preflight/watchdog constraints remain 8 GiB start and 6 GiB reserve.

This approval covers observation only. A visually dominant component or intact local surface cannot override the terminal 240-component technical HOLD or permit deletion, repair, placement, or runtime admission.
