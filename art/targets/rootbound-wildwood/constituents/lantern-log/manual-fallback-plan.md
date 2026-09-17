# Lantern log — measured manual fallback proposal

Root authored the reference and this construction brief; a separate builder must implement, and the independent reviewer owns plan and visual gates. This is a changed-method proposal, not a built model. Run it only if the second guarded TRELLIS attempt repeats export refusal, and only after independent review. It would be the third model attempt for this constituent; neither reference edits nor the small CPU contact probe are whole-asset builds.

## Reference and dimensions

Use reference-v2.png: one broad hero cap, three medium caps including the farther one, and two young caps on one gently bent log. Exact dimensions are deliberate design choices, not recovered 3D measurements. The proposed log is 1.6m long and about .47m wide; complete height is about .9m. The hero cap is .5m wide. The old prose's .42m cap width was a prompt starting point, not a measured target invariant. Preserve full view margins and inspect apparent scale rather than stretching components to match every old number.

## Tool-aware construction

Use Blender 4.5 `Mesh.from_pydata` for literal section lofts and opaque closed caps, then `bmesh` outward-normal recalculation on each closed connected component. Read the project asset-modeling-director and forge guidance. Its contribution here is explicit section geometry and early actual massing/contact proof; the tree's repeated scalar displacement does not apply. No remesh, Boolean, image texture generation, subdivision or sphere-and-cylinder substitution is needed.

The operative JSON defines log sections as X/centerY/centerZ/radiusY/radiusZ and defines stem centerlines/radii independently. The executed CPU probe reports derived segment lengths and bends. Log sections use 12 matching vertices around the X axis with Y=radiusY*cos(angle), Z=radiusZ*sin(angle). Bridge adjacent rings consistently; near end is an outer-to-inner annulus, a .10m shallow inset and a closed dark inset face, not a tunnel. Far end is closed. Bark is six broad attached strips following this same surface; moss is three restrained surface patches. Each is a closed solid with deliberate small overlap, not a floating plane.

For every mushroom, loft eight-sided stem sections through its three centers. Build the cap with 12-sided elliptical rings from top pole through shoulder, rim, underside and bottom pole. A zero-radius ring must be one vertex, not twelve duplicates: fan to its adjacent ring. The listed cap radius factors and height factors define taper. Stem and cap are individually closed with covered overlap; no welded union is claimed. Broad violet planes and pale undersides supply shape; omit gill wedges unless they improve an actual review view.

## Executed feasibility and remaining proof

Grounding correction before any build: clip generated log side/end vertices at source Z=.075m, then translate the entire completed asset by -.075m. This preserves all stem/cap/log relative contacts and makes a broad flat log underside rather than balancing the prop on its single lowest rim vertex. The CPU probe includes that clipped side surface and records ground-plane triangles; the builder must calculate their actual positive area and bounds after triangulation. Bark remains above that plane. This changes the full proposed height to approximately .825m without stretching.

The probe triangulates only the proposed log side surface (96 triangles). Vertical barycentric hits at all six stem-base centers give 1.37–6.49cm of penetration into the log. Cap-axis penetration is 1.36–4.30cm. These are real limited contact measurements, not closure, full-surface intersection or visibility proof. The full model must audit actual complete bounds, grounded log underside, six stem/cap pairs and outward closed component triangles before rendering. Intentional bark/moss/stem overlaps are allowed and reported. Exposed floating patches, missing contact or paper-thin caps are failures.

Render both log ends, both sides, top, underside and the source-facing camera from (-1.3,-1,.9), at 512/96/48px with matching white/neutral lighting and flat materials. The main view must retain the hero, farther cap and visible young caps; side/underside views must account for all six attached stems. Save actual editable Blender file, executed code, frozen input hash and receipt. If a gate fails, preserve the terminal evidence; do not repeatedly rebuild under the name of a probe. No runtime/collision/harvesting admission follows from a static render.
## Pre-build end correction

The independently reviewed executable exposed a coincident bottom edge when the original .64 inner radius was clipped to the ground plane. Use the revised literal inner radius ratio **.58** in both the annulus and recessed end. Its source bottom is .0861m, leaving .0111m above the .075m clip plane; the .10m recess depth and all other proportions remain unchanged. Recalculate normals after grounding and audit final triangles. This supersedes the earlier .64 construction value without changing the log/stem/cap composition.
