# Independent eight-leg landmark review

**GO for a bounded fitted-rig preparation build.** `landmarks.json` SHA-256 `2f6bd684f4fe3b5398b6424bc32aa31179909d23cb75e53a2efe80e437d3b4c2` correctly replaces the mixed-axis draft as the sole operative input.

Its Blender-world Z-up convention, uniform scale and ground shift agree with the measured GLB bounds: the 0.4946 m source height scales to the stated 0.9 m target, while the shift grounds the global lower extent. Eight actual chains are supplied in four left/right longitudinal bands. Each knee, ankle and component-specific sole lies within the source bounds; the frond tips are within the measured Z maximum, correcting the prior impossible tip coordinates. The gait’s two four-foot groups are appropriate for a diagnostic eight-leg walk.

Keep the existing textured GLB and its segmented/UV-seamed structure during this pass. The shell attachment roots are explicitly provisional, so neutral coverage and loaded-pose inspection remain real gates rather than inferred contact. Build only the stated neutral, loaded and short tripod-walk evidence. This approval does not admit a rig, animation, collision, runtime placement, or save behavior.


## Candidate R2 source review — HOLD

R2 correctly places mesh and armature beneath one metric root and keys alternating four-foot coxa/knee/ankle rotations. That fixes R1''s raw-versus-scaled coordinate error and body-bob-only walk.

It is not ready to execute. The actual loop assigns each vertex by distance to one of four **landmark knots**, while the contract says nearest leg segments. This can leave the long limb spans body-bound and has no per-region coverage evidence. Before running, implement segment-aware assignment (with the intended hoof override), then assert every one of the 32 deform groups has the intended nonzero region or document a deliberate empty group; assert all vertices have exactly one normalized owner and at most four influences.

The source also needs the contracted proof after export: neutral and alternating-pose deformation checks, plus GLB reimport evidence for the armature, action, keys, and actual duration. The current receipt only records source counts/bone count and nominal frame bounds. R1 remains preserved as invalid history.

## Candidate R2 repaired-source recheck — HOLD

The discrete-knot error is repaired: distance is now measured to coxa, knee, and ankle segments, and all 32 named regions must receive vertices. The shared metric-root arrangement remains sound.

Four narrow gates still fail in code. The stated one-owner assertion is tautological and does not inspect assignments; because every leg independently loops all vertices, a vertex can still enter more than one leg group. Track an owner count and require exactly one owner for every vertex. Bounds at frames 1/15/30 only show an evaluated envelope, not that alternating groups deform: record representative group centroids or hoof vertices per frame and assert planted versus swinging displacement. Save the original bone count before read_factory_settings, then assert the reimported GLB has exactly the expected armature, bones, WalkDiagnostic action, and duration; the current receipt only records arbitrary import inventory and accesses the pre-reset rig afterward.

These corrections remain within the planned R2 proof. No Blender execution is authorized yet.

## Root-owned fitted diagnostic source review — GO

Reviewed `build_fitted_diagnostic.py` SHA-256 `126d9696188ae2fef9a5f79f4e1a8ee9127e6a7fcca327ada1125549189e0a21`. It correctly replaces the unexecuted R2 draft.

The script moves the imported surface and every landmark into the same explicit metric space before creating bones. It assigns one normalized, bounded set of weights per vertex using the nearest of eight complete limb chains, then applies only local smooth joins, rigid hoof cores, head, and frond conditions. It asserts every deform group and every hoof core has coverage, and it checks the Blender vertex-group sums and influence cap.

The walk is a real alternating four-foot diagnostic: fixed-length two-bone solutions drive keyed upper, lower, and foot bones over a 1.1 s cycle, with a separate neutral and loaded clip. UV and polygon index digests block source-topology edits. The planned export inventory and fresh reimport checks cover skeleton size, mesh count, named clips, duration, evaluated finite vertices, and actual foot-center movement. This is adequate for one bounded Blender feasibility build.

Actual pose legibility, coxa coverage, planted-foot contact, texture behavior, and runtime compatibility remain post-build review gates; this source GO does not admit the rig.

## R1a reach-fit correction — HOLD for parameter disclosure

The failed R1 run is preserved and its failure is meaningful: rear-right required a 0.02019 m reach clamp at the original 0.045 m compression. The replacement preserves geometry, chain lengths, stroke, and lift; it changes only output directory, compression to 0.08 m, and the reach threshold to an appropriate near-zero value. The stated numerical sweep supports that correction.

Before execution, record `bodyDropM: 0.08` in the emitted receipt and amend the R1a plan/README to say that this supersedes the previous 0.045 m diagnostic value for this run. The existing landmark and rig-plan language still names 0.045 m, so executing the larger nine-percent-height compression without that clear provenance would silently change the reviewed pose. This is a disclosure-only correction; it is not another geometry or gait redesign.

### Final R1a source gate — GO

Reviewed final builder SHA-256 `e1f83442265c8699107d7d59aa2535f503edb1b890a850a277c8aebef9d0786c`. The receipt records `bodyDropM: 0.08`, and the R1a amendment explicitly supersedes the former 4.5 cm setting with the measured no-clamp compression while keeping the remaining gait parameters fixed. **GO for one fitted diagnostic build.**

