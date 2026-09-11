# Immersive crafting and equipment — provisional production plan

September 11 owner steering is recorded verbatim in OVERNIGHT_OWNER_REQUESTS.md. Crafting/building should be visible and in-world, futuristic, progressive across distinct stations, with equipable quick-access slots. This document proposes implementation choices; these are not owner-approved balance or completed features.

## Reference findings and application

- [Unknown Worlds: Subnautica seabases](https://unknownworlds.com/en/news/subnautica-seabases-released) describes constructing a Builder at a Fabricator and placing modular components in the world. Adopt an explicit held build tool, full-model placement preview and physical completion feedback. Our camera and touch input differ, so use ground aiming with generous controls.
- [Unknown Worlds' Cyclops announcement](https://store.steampowered.com/news/posts/?appids=264710&enddate=1425050530&feed=steam_community_announcements) describes a separately crafted Constructor assembling a visible vehicle from supplied materials. Apply the small-scale idea of the actual station presenting/assembling its output; no vehicle system is implied.
- [Hello Games: NEXT](https://www.nomanssky.com/en/next-update/) documents buildable refiners converting resources into more valuable construction inputs and deployable equipment carried in inventory. Adopt distinct station purposes and recognizable material-to-tool progression. Avoid a large recipe dependency maze.
- [Minecraft controls](https://www.minecraft.net/en-us/article/minecraft-controls) explains touch hotbar selection and inventory access. Adopt fast touch selection and explicit inventory slot assignment, scaled to landscape phone touch targets rather than copying nine tiny slots.

## Small complete player loop

The owner subsequently named Satisfactory as a motion reference. [Coffee Stain's official trailer workflow](https://www.youtube.com/watch?v=s7H3vrje1nQ) is a primary visual reference for industrial staging; implementation here is our own design inference. Preserve a moving fabrication carriage/nozzle, seated output and separate resonance mechanism. Motion should distinguish idle, working and complete at actual phone scale, without reflections or expensive simulation. Chests and ruins need equally physical open/activation states. A status light alone is insufficient evidence.

1. Begin with the existing crude Omni-tool. Gather alien sapwood, fiber and mineral; return to secure it. The existing extraction risk remains.
2. Equip a construction tool/blueprint from the bottom bar. Walk to the Camp clearing, choose a model card, aim its actual translucent silhouette on the ground, rotate and place. Materials and placement commit atomically; cancel spends nothing.
3. Place a **Salvage bench** for lures, basic snares and simple field supplies. Its visible jaws, cloth spool and tray communicate assembly.
4. Progress to a **Matter fabricator** using secured iron/crystal. It produces powered harvesting/combat tools and medical supplies. A compact printer cradle visibly presents a selected item and a short assembly sequence; no unattended real-time queue needed.
5. A **Resonance workbench** specializes in Wildkin chimes and later resonance gear; the reinforced tether currently belongs to the Matter fabricator. Reuse discovered companion/region progression for gating, not arbitrary levels plus duplicate currency.
6. Tap an owned item in inventory, choose a bar slot, return to the world and use it. Build pieces, medicine/food and taming gear invoke their existing authoritative actions. The selected tool is visible in the Explorer's hand; the primary action icon/label reflects that item.

## First implementation boundary

- Five equipable quick slots plus Pack, minimum 48px touch targets, clear selected outline and counts. Numeric keys 1–5 on desktop; small layouts keep buttons usable without consuming the whole view. Equipment should not compete with right-drag orbit or left movement.
- Inventory stores ownership/counts once. Bar slots refer to item IDs; they are not duplicate stack storage. Validate unknown/duplicate/stale slots, selection, save export/import, load, clear, extraction/death and storage-write rollback.
- Select an item before using it; selecting medicine must not consume it. A primary Use action consumes only when valid. Empty items retain a readable empty count or fall back predictably, with no hidden attacks.
- A powered cutter should improve harvesting with distinct visible silhouette/feedback. One ranged prototype can reuse the existing projectile owner and collision queries if it can complete aim/fire/hit/cooldown and movement/menu/reset paths cleanly. Do not ship icons advertising unimplemented weapons.
- Crafting occurs beside the appropriate actual placed station. Show a small visual recipe selection and material icons, station output preview and a brief visible assembly. Keep the world visible; avoid an all-purpose pause menu.
- Existing field recipes and basic Camp services continue to function during migration. Required species taming cannot become progression-deadlocked by a new station recipe.
- Bed rest is unfinished. Doorway's obstructive diagonal visual braces have become upright post straps, keeping the visible opening consistent with its existing post/lintel collision.

Generate a new actual-landscape target for the toolbar/station view before final UI/art admission, then separate implementation and independent review. Verify a complete gather/secure → build station → craft → assign → use → reload path with native inputs. Recipe tests protect spending/ownership; actual images and play prove clarity.

## Implemented station checkpoint

The three physically animated stations and compact in-world recipe panels are integrated. Native crafting, two-instance isolation, pause/resume, product seating, counts, reload and separate Author reset pass the bounded 844×390 review. Model sources include useful movable assemblies and pivots. See `ANIMATED_STATIONS_REVIEW.md`. Powered harvesting/ranged weapons, food, bed rest and moving discovery ruins remain next work, rather than features implied by the generated reference.
