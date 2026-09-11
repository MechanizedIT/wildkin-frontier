# Shatterfen observatory bank — September 11, 2026

The active candidate adds an irregular gravel approach and two unequal slate outcrops around the existing Fen receiver. It preserves the island's actual terrain heights, water, waypoint and resources. One decorative monolith moves outboard to make room for the right assembly; this scenery adjustment does not move a gameplay anchor. This is one bounded area; the wider region's earlier 4.8/10 composition review remains open.

## Target and model decisions

The root authored `.dream-loop/overnight-shatterfen-bank/target-v1/target.png` from actual game framing and the owner's Explorer style. Its SHA256 is `2743ce18201b2c9b3129947211ac4758b6fe5c90f4861db7a676ce660303b882`; independent reference review passed 8.3.

V1 resembled a manufactured block. V2/V3 exposed overlapping moss faces, and V4 retained a single-boulder silhouette instead of the target's layered ledges. Those studies remain excluded. The separate model producer's V5 uses a low ledge and an offset high shoulder, with a differently proportioned right-hand assembly. Independent review of eight actual assembled views passed 8.0. Admission concerns the specified assemblies, not isolated component thumbnails.

- Low ledge: `assets/models/fen-bank-outcrop-left-v1/model.glb`, SHA256 `88042856133aacefb65c281eb3b3e4da8664878e44f2deef7534ec4cd68338e4`.
- High shoulder: `assets/models/fen-bank-outcrop-right-v1/model.glb`, SHA256 `46e1b60328873b89eb99f622ecf5ca4628cd66fbbbdfffd3592fbe9d762ea109`.
- Two meshes total 34,296 bytes; four placed instances total 1,296 triangles and four material batches. Each uses a 256 px palette.
- Editable sources, exact collision surfaces and assembly manifests live in matching `art/source/` folders. More detailed slate fracture and rear moss refinement remain fidelity limits.

## Shared collision and terrain contract

Each component has a deliberately authored, closed convex surface of 20 points and 36 faces. The build composer imports its exact source `collider.json` into the world data. Runtime never generates collision from detailed GLB geometry. The validator restricts this bounded shape to static props, checks convex outward closed faces and rejects malformed/degenerate surfaces. Existing harvestable boxes and creature capsules retain their contracts.

The same descriptor drives scaled/yawed Rapier contact and Author's visible/hidden/isolated hull proxy. Author preserves the source hull during placement/export/reload; a deliberate fitted-box action remains available. Camp placement and campaign clearance derive conservative bounds and rotate the local offset consistently. Focused tests exercise malformed source rejection, actual Rapier cuts/slopes, section lifecycle, preview scaling, save/export and Camp bounds.

Gravel is painted once into the existing terrain texture, with bounded temporary canvases. It adds no physical surface or extra runtime texture. Local clearing masks suppress intersecting meadow tufts without reseeding distant foliage; retained meadow instance matrices and untouched terrain heights are checked directly.

## Native and packaged gates — passed

Actual V1 held at 5.6: the low ledge was mostly buried, the right mass missed the target framing, the gravel read as a uniform apron, and the foreground rock hid the player's body. V2 improved the model placement and narrow route, reaching 7.4; V3 reached 7.5 and closed the visibility defect. V4's connected uneven path margins and longer olive/gold folded fronds passed independent actual-game review at 8.0. The exact two GLBs stay unchanged. Preserve failed views as evidence, not accepted scenes.

The occlusion defect comes from the original single upper sightline clearing a sloped rock while the rock hides the body. Reproductions use both exact failed native camera poses and the approved hull surface. The shared visibility owner now checks a lower body line as well as its existing upper line at the same 10 Hz; materials remain isolated per instance, with normal orbit/inactive-section restoration and opaque support when standing above the crown. The native gate must confirm actual player visibility, not just a changed opacity value.

Native route walking, waypoint approach and stone/crystal harvesting have passed in the disclosed diagnostic section fixtures. Both shoulders independently fade and restore after native orbit; low ledges stay opaque where the body is unobstructed, support stays opaque when standing above it, and ordinary movement exits the joined seam. Author's actual 0.8 scale/35-degree yaw, export/reload, retained hull selector, hidden and isolated proxy, and Play preview pass. V4 contains only three new art views; these reuse the separately documented V3 gameplay/Author proof. A short fresh V4 walk through the moved nonblocking frond also passes. There are no browser errors.

The same visibility owner now receives player-built Camp visual creation/removal callbacks. Focused tests cover dynamic registration, shared-material isolation, removal cleanup and saved construction loading. Actual packaged native Build/Place, independent wall fade, sibling opacity, removal and walking through the former collider, literal saved-wall reload and offline restoration pass. No building cost, placement, collision or persistence rule changed.

Aggregate `npm run verify` passes 759 tests plus world/campaign synchronization, portable build and validation. The unpacked game is 44,046.8 KB (43.01 MB), and `npm run zip` produces 20,619.5 KB (20.14 MB). The packaged browser verifies both exact GLB response hashes, the normal bank and shoulder fade/orbit online and already-loaded offline, the Camp-wall lifecycle, and the compact long-haul results. Seventeen observations and 75 local requests report no runtime errors, failed/external requests or requests after going offline. See `.dream-loop/overnight-bank-package/`. These fixtures do not constitute an earned full campaign, a cold disconnected boot or physical-phone performance result.

## Human spot check

In Shatterfen, reach the observatory island with the moving receiver and extraction marker. Walk the gravel approach, circle both rock groups and pass between the receiver and harvestable stone. The Explorer should remain visible and move without catching on an invisible lip. Try the low ledge from several sides: contact should follow the visible sloped surface, with no floating support beyond the rock. Orbit the camera while approaching the stone and nearby crystal; their collectible shapes and interaction feedback should remain recognizable.

In Author, select a Fen bank rock and show its collision proxy. The wire surface should follow its clipped/sloped form. Scale and turn a disposable draft, export/reload and enter Play; the same visible shape should block the player in the same place. Do not overwrite a valued personal draft for this diagnostic check.
