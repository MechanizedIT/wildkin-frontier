# Composable life and Camp systems

September 12, 2026. Provisional implementation choices responding to Chris's interest in modular entities, buffs, crops and machines. Current code remains vanilla JavaScript with explicit owners and one loop. No ECS dependency or framework migration is adopted.

```mermaid
flowchart LR
  W[Wildkin identity] --> WG[Genetics and lineage]
  W --> WN[Needs and habitat data]
  W --> WE[Applicable status effects]
  P[Player identity] --> WE
  C[Crop plot identity] --> G[Saved growth process]
  Y[Young Wildkin identity] --> G
  M[Machine identity] --> J[Saved production job]
  J -. future reuse .-> G
  WE --> E[Effect rules]
  G --> T[Active-play process clock]
  E --> S[Explicit gameplay state owners]
  T --> S
  S --> V[Visual and audio feedback]
```

The diagram includes proposed capabilities; it is not a list of completed systems. Components are small records/capabilities attached by stable identity. Focused systems apply their rules. Runtime Three.js meshes and Rapier bodies remain separately owned resources. Avoid subclass combinations for every species, trait, crop and machine variant.

| Area | Current implementation | Next useful boundary |
| --- | --- | --- |
| Player bonuses | Upgrade/skill catalog data; progress derives modifiers, applied on relevant actions or purchases | Keep permanent progression separate from temporary effects |
| Combat effects | Player combat owns hit/dodge invulnerability and knockback; companions own ability cooldown; creatures own local recovery | Bounded effect records with explicit stacking, duration, source and removal rules when a real gameplay slice needs them |
| Crops | One saved plot/growth record; physical garden adapter; 90 seconds active play in 5-second save quanta | Shared saved-process clock with breeding |
| Breeding | Fixed child identity/genome/lineage plus 120-second active-play growth; atomic start/welcome | Reuse clock without merging crop or offspring rules |
| Care | One event-driven bed/individual/nourishment record; atomic berry feeding | Later per-individual needs/habitat records, with explicit limits and policies |
| Crafting | Immediate inventory transaction; 2.2-second station motion is cosmetic | A future durable production job must own input reservation, completion and output capacity before using a shared clock |

`frontierProgress` remains the save/transaction authority. `campGardenState` and `campBreedingState` validate domain data; `campGarden` and `campBreedingGrowth` currently duplicate active-play time accumulation. `baseSystem` and `companionSystem` reflect committed state visually. The first justified reuse is a rendering-free clock with injected state reader and atomic advance callback. Preserve process identity, progress rollback, pause/Author/background suppression and bounded unsaved time. Do not give presentation animation authority to grant items.

For later buffs, separate base values from derived values so expiring a buff never permanently edits health capacity, speed or yield. Define refresh/replace/stack limits per effect; remove effects through their explicit owner on death, unloading or expiry as that effect requires. Visual particles/icons read the resulting state. Persistent versus outing-only effects is a product decision for the implementing slice, not an assumption that every timer belongs in a save.

Performance policy: movement/collision use the existing fixed step; slow processes should use bounded lower-frequency work; unloaded simulation should retain small records, with catch-up only under an explicit simulation-time rule. No missed-day care penalty or offline growth is introduced by this plan. Current crops and young advance during active play, including outings, and stop while paused, hidden, offline or in Author.

Measure frame time, allocations, draw calls, physics and active population separately before changing storage architecture. An ECS can help organize/query many component combinations, but adopting one does not by itself establish a faster game. Existing bounded residency, cheap scenery and limited AI remain essential regardless of architecture. JavaScript supports composition with ordinary object records; see [MDN's object guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects). [bitECS](https://github.com/NateTheGreatt/bitECS) is an example of a JavaScript/TypeScript ECS available for later evaluation; it is not installed or selected here.
