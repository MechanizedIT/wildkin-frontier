# Wildkin Frontier — Historical Beta Candidate Plan

> **Historical reference.** The finite campaign described below is retained as source history and reusable design material. It is not the active product promise. The active direction is the portrait-mobile-first Living Frontier: an offline, single-player exploration and creature-life game with a physical Camp, short dangerous outings, individual Wildkin, and staged seeded regional geography.

## Current direction and evidence

Use [Current slice](CURRENT_SLICE.md) for live implementation, test/package status, and the selected Skybreak/province foundations. Use [Living Frontier plan](LIVING_FRONTIER_PLAN.md) for the staged destination. Three broad seeded terrain/ecology grammars now extend beyond the protected starter area; selected province art remains5.5/10 HOLD. Current evidence belongs in the current slice and its receipts.

The current build includes the five-slot portrait hotbar, separate Pack access, a personal atlas, individual Wildkin capture/banking/reload, body-tone expression, a physical nursery/garden, active-play growth, pairing with earned optional body-tone guidance, bounded terrain residency, and a shared world descriptor. It does not yet ship the proposed modular anatomy, broad reproduction system, cave/overhang regions, swimming, weather, DNA archive, community mapping, or online trade.

For the current visual and research record, see the [Living Frontier visual fieldbook](research/living-frontier/Living-Frontier-Visual-Fieldbook.pdf), [research appendix](research/living-frontier/Living-Frontier-Research-Appendix.pdf), [editable appendix Markdown](research/living-frontier/Living-Frontier-Research-Appendix.md), and [image manifest](research/living-frontier/image-manifest.md).

## Historical candidate scope and provisional design


This is a finite handcrafted adventure with repeatable expeditions, aiming at roughly 60–90 minutes for an initial campaign (a tuning target, not measured playtime). Ordinary runs should produce a worthwhile decision within 5–10 minutes. Long-term additions from older documents remain potential expansions; this build must finish a coherent arc before increasing breadth.

1. **Verdant Verge:** harvesting, deliberate combat, extract/bank, discover a Waypoint, first Mossling bond, natural high-ground exploration and revisit caches.
2. **Shatterfen:** blue wetland/crystal ecology, Tidefin, new materials and routes.
3. **Emberfall:** warm ruins, territorial Emberhorn, stronger combat/tool preparation.
4. **Windscar:** exposed stone and luminous vegetation, Skydancer, traversal/reward challenge.
5. **Heartwood Vault:** ancient guardian and recoverable Heartwood core; return to Camp to conclude the arc. Revisit all regions afterward.

**Bonding (September 11 candidate):** use species-specific field actions: sneak toward Mossling and place berries, lure Tidefin into a dry-bank snare and release it, avoid Emberhorn's committed charge before tethering/offering food, and use two quiet chime perches for Skydancer. These replace the historical resonance timing modal. Existing movement, physical access and ordinary-input discoverability are active review gates. Carry a new bond unsecured until extraction; death loses it. Start with one pending slot, expandable through upgrades. A secured active companion supplies a visible follower, its ability and a matching revisit reward.

**Progression (provisional, September 11 cutover):** banked XP remains level authority. Multi-tier Matter Attractor, Field Tool, Vitality, capture capacity and medicine offer deliberate resource spending. Healing is crafted from recovered materials. Finite backpack stacks and nearby physical storage replace unlimited carry/bank materials. Death currently keeps the backpack while losing carried XP and pending bonds. Reload resumes the saved expedition; these exact survival balance choices remain provisional.

**Next owner direction:** Rootfall begins the unique natural-obstacle pass, followed by further colony/research wreckage, a Camp helper drone, discoverable blueprints/parts and the larger tool/unlock economy. One defended adjoining Camp section and one physical backpack upgrade are already integrated. The Tidefin V3 animation study is not integrated; current gameplay retains its shipping model/animations.

**Combat tuning (provisional):** the early Thornprowler deals 1 damage against a starting 5 health and has 7 health. Cinderjaw has 16 health and deals 2; the final Guardian has 36 health, 2-damage shots and 2-damage telegraphed hazards. Peaceful wildlife has 6–12 health and 1–2 damage when provoked. These replace the initial authored values that could one-shot a new player; timing and meaningful avoidance should supply difficulty rather than inflated health or surprise lethal hits.

**Presentation:** teal/emerald alien wilderness, blue wetland light, amber Camp technology, warm mineral ruins. Stylized faceted models with distinct silhouettes. DOM interfaces use restrained ink/metal panels, amber rewards, mint safety and coral danger. Keep the world visible; journal, roster, crafting and controls open on demand.

## Work sequence

1. Audit and record revised scope; baseline tests and browser capture.
2. Parallel bounded production: world/art recipes; economy/save; explorer/lighting/atmosphere. Parent owns integration, bonding/companion play and UI.
3. Integrate full Camp → expedition → gather/fight/bond → extract/lose → spend → travel → finale chain. Exercise sibling reset/save/input paths.
4. Polish first launch, HUD, map, journal, results, feedback and gameplay balance from screenshots and actual browser input.
5. Validate meaningful state invariants, compatible regressions, generated world, packaged build and archive; browser-test development/package, desktop/phone viewports and author workflow. Record candidate evidence and player-facing playtest instructions.

## Release gates

- Fresh save can discover how to move, harvest, interact and leave Camp; no debug chrome in normal play.
- Campaign is physically navigable with reachable anchors, challenges and resources; progression does not softlock.
- Bond success/failure/cancel, capacity, secure/loss, companion ability and gated reward behave consistently.
- Purchases/crafting cannot overspend or bypass physical access/capacity; rewards cannot duplicate. Valid old saves migrate with retained overflow; malformed inventory imports reject without replacing the existing raw save.
- Map/menu/bonding/pause correctly block movement and attacks; visibility/focus loss cannot leave input stuck.
- Death/extraction/portal travel reset the appropriate transient state exactly once.
- No uncaught browser errors, external runtime dependencies, unbounded entity growth or duplicated frame loops.
- `npm test`, `npm run verify`, `npm run zip` pass; packaged page matches development presentation.
- Screenshots and browser interaction evidence supplement tests; real phone feel and owner acceptance remain explicitly human checks.

## Historical requirements

`HACKATHON_REQUIREMENTS.md` and phase specs remain historical evidence. Portable local assets, readable source, bounded performance and simple architecture stay useful engineering choices. Competition submission requirements do not define the released product or authorize publication.
