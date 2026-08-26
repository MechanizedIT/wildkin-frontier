# Wildkin Frontier — Phase 4B: First Expedition Experience & Pacing

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B  
**Canonical spec:** `docs/Specs/Phase_4B.md`

**Previous slice:** Phase 4B.0 — **OWNER ACCEPTED FOR NOW 2026-08-25** after several owner test/iteration sessions. Freeze generic Author Mode / Visual Asset infrastructure unless real Phase 4B level-authoring exposes a true blocker.

## Goal

Turn the rough Camp + Area 1 skeleton into one intentional **5–10 minute first expedition** that proves the game’s core risk/reward thesis:

```text
acquire value
→ see temptation ahead
→ assess danger
→ extract or push
→ consequence
→ Camp improvement
→ meaningfully better next run
```

The fresh player should move through:

```text
Camp
→ first Waypoint start
→ safe/readable harvesting
→ first complication
→ Extraction Beacon: EXTRACT / KEEP GOING
→ richer/more dangerous Pocket 2 + locked temptation
→ deeper accumulated risk
→ aspirational Threshold Rise Major Waypoint
→ smart extraction or understandable death
→ Camp result
→ Matter Resonator improvement
→ retry
```

This is a **player-experience/content/pacing slice**, not another tooling phase.

## Hard scope

- reshape/clarify Camp using the accepted Author + Visual Asset tools,
- intentionally author/tune the existing Area 1 pockets through Threshold Rise,
- Pocket 1 = comfort / harvesting / low-pressure ecology,
- one readable first danger before the first Beacon,
- first Beacon arrives after the player has something worth banking,
- Pocket 2 = visibly better value + more danger + memorable locked pond/island/chest-style temptation,
- Pocket 3+ = stronger pressure and higher-value opportunity while retreat remains possible,
- Threshold Rise = readable aspirational Major Waypoint, difficult but not hard-gated on a first run,
- tune resource/value distribution shallow → deep,
- tune Wildkin temperament/home/leash/danger shallow → deep,
- use landmarks and current Map/edge guidance to make forward vs safety readable,
- add exactly one persistent Matter Resonator purchase: **Matter Attractor I**,
- tune extraction/result/Camp feedback so successful return naturally leads to upgrade/retry,
- fresh-save, extraction, death, repeat-run, desktop and portrait-mobile human acceptance.

## Pacing targets

These are targets for real play feel, not timers:

- Camp: ~0:00–0:30
- Pocket 1 comfort: ~first 1–2 min
- first complication before Beacon 1
- Beacon 1 risk decision: ~1.5–3 min
- Pocket 2 temptation: ~2.5–5 min
- Pocket 3 pressure: ~4–7 min
- Threshold Rise aspiration: ~6–10+ min

A normal first-time player should be unlikely—but not mechanically forbidden—to reach Threshold Rise on the first run. A skilled/lucky player may succeed.

## Matter Resonator — one progression choice only

**Matter Attractor I**

Player-facing effect:

> Pickups begin pulling toward the player from farther away and travel somewhat faster.

Requirements:
- Camp-only contextual purchase,
- uses persistent banked materials,
- tune cost against the final authored run yield rather than arbitrary grind,
- one solid Pocket 2 extraction should usually make the player able or close to able to buy it,
- deduct once, persist across reload/death/new runs, cannot repurchase,
- next-run pickup attraction difference is clearly noticeable,
- preserve existing pickup collision/rest/magnet guarantees,
- no skill tree or progression framework.

## Explicit non-goals

Do not add:

- more generic editor/Visual Asset infrastructure unless a true blocker is proven,
- GLB/import tooling,
- Wildkin bonding/capture,
- companions/mounts,
- secured Wildkin Camp population,
- full Matter Resonator minigame,
- skill tree or multiple upgrades,
- crafting/equipment/loadout,
- ranged player weapon,
- carry-capacity pressure,
- Camp expansion/free placement,
- second frontier area/final endpoint,
- procedural world generation,
- broad engine/navigation refactor,
- broad final-submission polish.

## Implementation order

1. **Baseline:** fresh-save run current Area 1, record time/value/danger at anchors; do not improve tools.
2. **World/pacing:** Camp → Pocket 1 → complication → Beacon 1 → Pocket 2 locked temptation → Pocket 3 → Threshold.
3. **Value/ecology:** resource clusters, distinct deeper reward, Wildkin temperament/home/leash, retreat lanes, Beacon timing.
4. **Matter Attractor I:** implement/tune the one persistent Camp upgrade against actual run yield.
5. **Fresh-save playtest loop:** repeat full runs and fix only the highest-value pacing/readability failures.

Prefer authored data/layout/Visual Asset changes over new systems.

## Human acceptance anchors

Human must verify:

1. Fresh first 2 minutes are readable, rewarding and not immediately chaotic.
2. Beacon 1 presents a real `EXTRACT / KEEP GOING` choice because the player has value to lose and temptation ahead.
3. Pocket 2 clearly feels richer/more dangerous and its locked revisit POI is memorable, not confusing/broken.
4. Deeper pressure increases while retreat remains viable and Threshold Rise reads as an important goal.
5. Meaningful extraction clearly banks progress and returns control at Camp quickly.
6. Matter Attractor I is understandable, affordable on the intended curve, persistent, and noticeably improves the next run.
7. Death clearly loses unsecured value while preserving permanent frontier/upgrades.
8. Full Camp → expedition → Beacon → deeper push → extract/death → Camp → retry loop works on desktop and portrait mobile.

Automated tests do not prove pacing.

## Gates

Run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Preserve one looping first-party rAF, Rapier authoritative physics, offline/local runtime, readable source, portrait gameplay, and submission comfortably under 35 MB.

## Stop condition

Phase 4B is complete only when a human fresh-save playtest demonstrates:

> **acquire value → see temptation → assess danger → extract or push → consequence → Camp improvement → meaningfully better next run**

After acceptance, freeze first-expedition pacing except later regression/balance fixes. The next major gameplay planning step is **Wildkin bonding / securing / companion value** on top of the proven expedition loop.
