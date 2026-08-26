# Wildkin Frontier — Phase 4B: First Expedition Experience & Pacing

**Status:** READY TO IMPLEMENT  
**Active slice:** Phase 4B  
**Purpose:** Use the accepted expedition loop, Author Mode, and Visual Asset tooling to turn the rough Area 1 skeleton into one intentional 5–10 minute first expedition with a clear risk curve, meaningful extraction decisions, visible temptation, and one small persistent Camp upgrade that changes the next run.

Phase 4B.0 is owner-accepted for now. **Freeze editor / Visual Asset infrastructure.** This phase is about the player experience, not more tooling.

---

# 1. Required end state

A fresh-save player should experience this rhythm without needing external explanation:

```text
Camp
→ first Waypoint start
→ safe/readable harvesting
→ first complication
→ Extraction Beacon: bank or push?
→ deeper pocket with visibly better value + locked temptation
→ greater danger / more unsecured cargo
→ another meaningful chance to retreat
→ aspirational next Major Waypoint
→ extract smartly or die and understand the consequence
→ Camp result
→ one affordable Matter Resonator improvement
→ next expedition feels meaningfully better
```

Core acceptance question:

> **Does the first expedition make the player want to push one pocket farther than is comfortable, while always understanding what they stand to gain or lose?**

Target fresh-run duration: roughly **5–10 minutes** for a normal exploratory player. A skilled player may move faster. Do not enforce the target with an arbitrary timer.

---

# 2. Locked foundations

Preserve and use the accepted systems rather than replacing them:

- Phase 4A Camp ↔ expedition lifecycle,
- Major Waypoint start selection and persistent discovery,
- Extraction Beacon `EXTRACT / KEEP GOING`,
- unsecured run resources + XP,
- extraction banking / death loss,
- recovery/loss cards,
- Map and edge guidance,
- Field Tool harvesting/combat,
- current Wildkin temperaments / lightweight steering,
- region activation,
- Author Object contract,
- Visual Assets including Prop / Harvestable / Wildkin roles,
- custom resource drops / pickup models / depleted remnants,
- Visual Asset models for Waypoints and Beacons,
- desktop Author Mode for world layout.

World/content should remain data-driven through the current canonical world path.

---

# 3. Hard scope

Implement only the following player-experience work:

1. intentionally reshape and visually clarify Camp,
2. intentionally author/tune the current Area 1 pockets from first start to Threshold Rise,
3. establish a clear resource/value gradient from shallow → deep,
4. establish a clear Wildkin danger gradient from shallow → deep,
5. tune the first Extraction Beacon so the first risk decision arrives after the player has something worth banking,
6. make Pocket 2 contain a memorable visible locked temptation / revisit promise,
7. make deeper pockets increasingly dangerous and valuable without hard-locking retreat,
8. make the next Major Waypoint a readable aspirational target,
9. tune Map / edge guidance only as needed for the authored route,
10. add a **single small Matter Resonator purchase** at Camp,
11. make that purchase persist and visibly improve the next expedition,
12. tune result / Camp feedback enough that extraction → improvement → retry reads as one loop,
13. run fresh-save, extraction, death, repeat-run, desktop and portrait-mobile acceptance,
14. preserve all hackathon/offline/performance constraints.

---

# 4. Explicit non-goals

Do **not** implement:

- more generic Author Mode infrastructure,
- more Visual Asset modeling features unless a true blocker is found,
- GLB/import pipeline,
- Wildkin bonding/capture,
- companions or mounts,
- secured Wildkin Camp population,
- full Matter Resonator minigame,
- skill tree,
- multiple Resonator upgrades,
- crafting system,
- equipment/loadout system,
- ranged player weapon,
- inventory/carry capacity pressure,
- Camp expansion/free placement,
- second frontier area,
- final deep-frontier endpoint,
- procedural world generation,
- A*/navmesh unless current real Area 1 proves steering unusable,
- broad engine refactor,
- broad submission/final polish pass.

Bonding/companions remain the next major gameplay expansion after this expedition is fun enough to justify them.

---

# 5. Experience budget / target rhythm

These are **pacing targets, not rigid timers**. Adjust by real playtest feel.

## Camp — 0:00–0:30

Purpose:
- immediate control,
- visually readable Drop Pod / Resonator / frontier gate,
- obvious exit direction,
- no clutter competing with the gate.

Requirements:
- Drop Pod reads as arrival/home landmark,
- Resonator is visible but does not block the fresh player,
- gate/frontier direction is visually dominant,
- map button remains obvious,
- first launch does not become a tutorial menu.

Use the existing Visual Asset library to give Camp a coherent frontier-outpost silhouette: fence/wall pieces, small machinery/furnishings only where they improve readability.

## Pocket 1 — Comfort / learning — roughly first 1–2 min

Purpose:
- movement confidence,
- satisfying harvesting,
- establish unsecured cargo,
- show mostly non-threatening ecology before danger.

Author for:
- several easy/common harvestables near and slightly off the main line,
- visually readable resource clusters rather than random scatter,
- predominantly skittish/defensive or otherwise low-pressure Wildkin,
- enough free space to learn movement/dodge/harvest,
- a clear forward landmark.

The player should obtain enough cargo that losing it would be mildly disappointing before the first Beacon.

## First complication — before Beacon 1

Introduce one readable pressure event:
- a territorial/aggressive Wildkin guarding useful material,
- or another existing threat configuration.

Do not create a scripted encounter system. Use authored placement, temperament, home/leash, obstacles and resource temptation.

The player should be able to avoid, retreat from, or fight it.

## Extraction Beacon 1 — roughly 1.5–3 min

This is the first real thesis moment.

Before the player reaches it, they should normally have:
- visible unsecured cargo,
- some XP or combat/harvest investment,
- experienced at least one threat,
- seen something interesting ahead.

At Beacon 1:
- `EXTRACT` must feel reasonable,
- `KEEP GOING` must feel tempting,
- the deeper path should be visually readable from/near the Beacon,
- the player must not need the map just to discover which direction is deeper.

Do not place Beacon 1 so early that there is nothing to lose or so late that the mechanic is learned after the danger spike.

## Pocket 2 — Temptation — roughly 2.5–5 min

Purpose:
- noticeably better/novel value,
- stronger threat density,
- a memorable future-revisit promise.

Required landmark:
- preserve/build the **pond/island/locked chest** concept (or an equivalent already-authored locked POI if the current layout has evolved),
- the reward should be visibly desirable,
- the player should understand it is unavailable **for now**, not bugged,
- no Phase 4B unlock for it is required.

Use the new Visual Asset content capabilities to make this pocket visibly different from Pocket 1: denser vegetation/ruins/crystal/ore landmarks are appropriate.

At least one deeper resource/drop should be visually distinct from the shallow common materials. Prefer an existing authored/custom drop path rather than adding a new inventory architecture.

## Pocket 3 — Pressure / accumulated risk — roughly 4–7 min

Purpose:
- player now carries enough value that retreat has emotional weight,
- stronger/more overlapping territorial or aggressive threats,
- better resource opportunity,
- retreat remains physically possible.

Requirements:
- avoid an unavoidable combat gauntlet,
- do not simply multiply enemy count until the phone/gameplay degrades,
- use terrain, leash/home placement and temptation to create danger,
- make the route back toward safety legible.

A second Extraction Beacon is allowed **only if it creates a better decision**. Keep the current count if it already works; do not add checkpoints mechanically.

## Threshold Rise / next Major Waypoint — roughly 6–10+ min aspiration

Purpose:
- clear deep objective,
- reaching it should feel like a real frontier breakthrough,
- unlocking it as a future start materially shortens later runs.

Fresh-run target:
- an ordinary first-time player is **unlikely but not mechanically forbidden** from reaching it,
- a skilled/lucky player may succeed,
- danger/value/traversal pressure—not an invisible lock or timer—should make first-run success difficult.

The player should be able to see/understand that something important lies ahead before committing to the final push.

---

# 6. Resource/value gradient

Author/tune the resource distribution so `deeper = more valuable` is visible in play.

Use current resource systems and Visual Asset harvestable roles.

Suggested shape:

```text
Pocket 1
common / safe:
  wood / fiber / basic stone

Pocket 2
common + first novel/deeper material:
  denser stone / ore / crystal-like resource

Pocket 3+
higher density / higher-value material:
  scarce deeper resource near greater danger
```

Exact IDs and counts should follow the current canonical resource catalog; do not rename working saved-resource keys casually.

Requirements:
- shallow common resources remain useful,
- deeper resources are visually distinguishable,
- reward density rises without turning into loot clutter,
- pickups/results use readable display names,
- one successful deeper extraction should feel materially better than farming only Pocket 1.

Do not add resource rarity tiers or crafting recipes in this phase.

---

# 7. Danger/ecology gradient

Use existing Wildkin behavior rather than creating new AI.

Target shape:

```text
Pocket 1: mostly skittish / defensive
first complication: one territorial/aggressive lesson
Pocket 2: mixed ecology, clearer guarded value
Pocket 3+: more aggressive/territorial overlap and ranged pressure where readable
Threshold: strongest current combination, still escapable
```

Requirements:
- enemies must have enough space to behave correctly,
- home/leash zones should prevent every creature from following the player through the whole frontier,
- retreat should de-escalate encounters naturally,
- ranged + melee combinations should be used sparingly and intentionally,
- do not balance by inflating HP into damage sponges,
- use existing rusher/spitter/Wildkin Visual Asset roles only.

If a specific authored location exposes a real steering failure, fix the smallest shared gameplay issue needed; do not reopen generic navigation architecture.

---

# 8. Visual/landmark pass

This is not a final art-polish phase, but the first expedition must be visually readable.

Use the accepted Visual Asset system and starter library to establish clear landmarks and pocket identity.

Priority:
1. Camp silhouette / gate readability,
2. Pocket 1 natural frontier entrance,
3. Beacon 1 landmark,
4. Pocket 2 locked pond/island/chest landmark,
5. deeper ruin/crystal/ore landmarking,
6. Threshold Rise / Major Waypoint silhouette.

Requirements:
- avoid decorating every empty meter,
- keep walkable space readable from the near-top-down camera,
- do not hide important harvestables/hostiles behind tall decorative clutter,
- reuse shared recipes aggressively,
- create a small number of new primitive recipes only when needed for a landmark or gameplay read,
- preserve mobile performance and region activation behavior.

---

# 9. Guidance / Map tuning

Do not redesign the Map.

Tune current guidance around the authored experience:
- the next deeper Major Waypoint/goal points forward,
- a relevant extraction opportunity remains discoverable when the player wants safety,
- indicators do not point backward as the supposed forward objective,
- do not show a wall of simultaneous markers,
- discovered Beacons remain map information but not selectable starts,
- Major Waypoint unlock remains clearly different from Beacon discovery.

If possible, use world landmark readability first and HUD guidance second.

---

# 10. One Matter Resonator progression choice

Implement **exactly one** persistent Camp improvement:

## Matter Attractor I

Player-facing effect:

> Pickups begin pulling toward the player from farther away and travel somewhat faster.

Why this choice:
- immediately noticeable on the next run,
- reinforces harvesting/recovery without touching combat balance,
- uses an existing system rather than introducing equipment/crafting,
- easy for a judge to understand,
- creates a concrete `extract → improve → retry` loop.

### Purchase flow

At Camp, near the Matter Resonator:

```text
MATTER RESONATOR
Matter Attractor I
[cost]
SYNC
```

Keep this to one compact contextual panel/action, not a skill tree.

Requirements:
- only available at Camp,
- reads current banked resources from persistent frontier progress,
- unaffordable state clearly shows what is missing,
- purchase deducts cost exactly once,
- unlock persists across reload/death/new runs,
- cannot be purchased twice,
- next-run pickup magnet radius increases noticeably,
- pickup travel speed may increase modestly with it,
- existing pickup collision/rest/magnet guarantees remain intact.

### Cost tuning

Do **not** hard-code an arbitrary grind cost before looking at the final Phase 4B yield curve.

Tune the cost so:
- farming only the safest Pocket 1 is not the obviously fastest route,
- one solid extraction reaching Pocket 2 should usually make the player able or close to able to buy it,
- the player understands deeper extraction accelerated their progress,
- no more than the current resource catalog + at most one already-authored deeper material is required.

If introducing/using one deeper material in the cost, ensure the material is obtainable before Threshold Rise and is clearly visible/readable.

### Feedback

After extraction, if the player can afford the upgrade, a small result/Camp hint such as **“Matter Resonator upgrade available”** is sufficient.

After purchase, give one brief confirmation and a readable Resonator state change. Do not build a progression-menu framework.

---

# 11. First-run teaching / copy restraint

Teach through layout and consequences first.

Allow only short contextual copy where needed.

At most add a few one-time hints such as:
- unsecured cargo is lost on death,
- Beacon = Extract / Keep Going,
- Resonator upgrade available after a successful return.

Do not add dialogue, lore dumps, tutorial pages or repeated blocking modals.

---

# 12. Implementation sequence

Work in this order so systems changes do not outrun play feel.

## Pass A — Baseline / preserve

- run current tests/gates,
- fresh-save play current Area 1 once,
- record approximate time/value/danger at current anchors,
- confirm 4B.0 authoring tools needed for this phase are stable enough,
- do not improve the editor unless blocked.

## Pass B — World/pacing authoring

Use Author/world data to shape:
- Camp,
- Pocket 1,
- first complication,
- Beacon 1,
- Pocket 2 + locked POI,
- Pocket 3 pressure,
- Threshold Rise approach.

Prefer data/layout/Visual Asset changes over new code.

## Pass C — Value/ecology balance

Tune:
- resource clusters/drop values,
- Wildkin type/temperament/home/leash,
- Beacon placement,
- traversal/retreat lanes,
- landmark visibility,
- guidance.

## Pass D — Matter Attractor I

Add the single persistent Resonator purchase and tune its cost against the authored yield curve.

## Pass E — Fresh-save playtest loop

Repeat full fresh-save runs and adjust only the highest-value pacing failures.

Stop adding features.

---

# 13. Automated coverage

Add focused tests where deterministic contracts can be proven.

At minimum cover:

- fresh save still exposes only the first Major Waypoint start,
- Beacons never become selectable starts,
- Area 1 authored data validates after layout/content changes,
- required first Beacon and Threshold Major Waypoint remain reachable/represented in the registry,
- locked temptation POI remains locked on a fresh save,
- deeper resource/drop IDs resolve through the canonical catalog,
- Resonator upgrade cost references valid resource IDs,
- purchase fails atomically when unaffordable,
- successful purchase deducts exact banked amounts once,
- purchase persists through serialization/reload,
- purchase cannot repeat,
- Matter Attractor modifier reaches actual pickup magnet radius/speed path,
- death does not remove purchased upgrade,
- existing extraction/death result accounting remains correct.

Do not pretend unit tests prove pacing. Pacing requires real runs.

---

# 14. Required human acceptance

## Test 1 — Fresh first 2 minutes

Reset player save and start from Camp.

Pass if:
- Camp/gate direction is immediately understandable,
- first start selection is clear,
- Pocket 1 gives satisfying harvesting quickly,
- unsecured cargo becomes visible,
- ecology begins readable rather than immediately chaotic,
- first complication is understandable and escapable.

## Test 2 — First Beacon decision

Play naturally to Beacon 1.

Pass if:
- you have enough cargo/XP that extraction would not feel pointless,
- deeper content is visibly tempting,
- `EXTRACT / KEEP GOING` is understandable without explanation,
- both choices feel defensible.

## Test 3 — Pocket 2 temptation

Choose KEEP GOING.

Pass if:
- Pocket 2 clearly feels richer/more dangerous than Pocket 1,
- the locked pond/island/chest (or approved equivalent) is memorable and visibly unavailable rather than broken,
- at least one deeper resource/reward is visually distinct,
- you can still decide to retreat.

## Test 4 — Deep pressure / Threshold aspiration

Push into Pocket 3 / Threshold approach.

Pass if:
- carried value now makes death matter,
- danger rises noticeably without becoming a forced mob wall,
- retreat remains possible,
- next Major Waypoint reads as important,
- reaching it on a blind first run feels difficult but possible rather than hard-gated.

## Test 5 — Smart extraction → Camp

Extract after a meaningful deeper run.

Pass if:
- recovery card clearly communicates what became safe,
- Camp returns control quickly,
- Resonator is easy to find,
- the successful run feels like progress rather than only a score reset.

## Test 6 — Resonator → second run

Buy Matter Attractor I when affordable, then begin another run.

Pass if:
- cost/payment is understandable,
- purchase happens once and persists,
- pickup attraction difference is noticeable without being absurd,
- the second run feels slightly more capable/convenient,
- the effect works on desktop and portrait mobile.

## Test 7 — Death lesson

On a run carrying meaningful unsecured value, die.

Pass if:
- loss card clearly distinguishes lost unsecured value from retained permanent progress,
- Resonator upgrade remains owned,
- discovered frontier progress remains according to Phase 4A rules,
- another run can begin immediately.

## Test 8 — Full prototype smoke

Desktop + portrait phone viewport:

```text
Camp
→ choose first start
→ harvest
→ encounter Wildkin
→ Beacon decision
→ push deeper
→ extract or die
→ Camp result
→ Resonator state
→ start again
```

Pass if the loop is readable, responsive, performant and free of Author-only presentation artifacts.

---

# 15. Automated gates

Run:

```bash
npm test
npm run world:generate
npm run world:check
npm run verify
npm run zip
```

Maintain:
- one looping first-party `requestAnimationFrame`,
- Rapier-only authoritative physics,
- offline/self-contained runtime,
- local vendor references,
- root `index.html`,
- readable first-party source,
- portrait-mobile gameplay,
- submission comfortably under 35 MB.

---

# 16. Completion condition

Phase 4B is complete only when a human fresh-save playtest demonstrates:

> **acquire value → see temptation → assess danger → extract or push → consequence → Camp improvement → meaningfully better next run**

Do not declare completion because the world validates or because automated tests pass.

When Phase 4B is accepted:
- freeze first-expedition pacing except for later regression/balance fixes,
- do not reopen generic editor/tool work,
- next major gameplay planning step is **Wildkin bonding / securing / companion value** on top of the now-proven expedition loop.
