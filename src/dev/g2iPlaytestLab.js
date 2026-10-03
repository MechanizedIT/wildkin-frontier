import { CREATURE_SPAWNS } from '../creatures/creatureConfig.js';
import { getSurfaceHeight } from '../world/terrainSurfaceModel.js';
import { FIELD_RECIPE_BY_ID } from '../base/baseCatalog.js';

export const G2I_SECTION = 'section_1';
export const G2I_SCENARIOS = Object.freeze(['1 — Combat + Harvest', '2 — Dodge Evaluation', '3 — Starter Taming']);

export function getG2IConfig(search) {
  const p = new URLSearchParams(search);
  const enabled = p.get('g2i') === '1' && p.get('author') !== '1' && p.get('scout') !== '1';
  const requested = p.get('scenario');
  return Object.freeze({ enabled, scenario: ['1', '2', '3'].includes(requested) ? Number(requested) : 1 });
}

// No read-through from an owner's save, and no write-through in any lifecycle.
export function createG2IStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

export function isolateG2IProgress(progress) {
  const blocked = () => ({ ok: false, reason: 'demo-session', message: 'Demo setup cannot be exported or imported. Open ordinary play for saves.' });
  return { ...progress, exportSave: blocked, importSave: blocked };
}

export function createG2ISetup(canonical, config) {
  if (!config.enabled) return { world: canonical, feet: null };
  const world = structuredClone(canonical);
  const section = world.regions.find(r => r.id === G2I_SECTION);
  const point = (x, z) => ({ x, y: getSurfaceHeight(section.surface, x, z), z });
  const feet = point(-10, 35);
  if (config.scenario === 1) {
    const template = section.resources.find(r => r.type === 'rock');
    section.resources.push({ ...template, id: 'g2i-rock', pos: point(-10.5, 33.5) });
  }
  if (config.scenario !== 3) {
    const template = CREATURE_SPAWNS.find(c => c.id === 'rusher_hunter');
    const pos = point(config.scenario === 1 ? -8 : -6, 31);
    section.creatures.push({ ...structuredClone(template), id: 'g2i-hostile', pos, homePos: { ...pos }, facingYaw: Math.atan2(feet.x - pos.x, feet.z - pos.z) });
  } else {
    // Hydrated by the same registry as authored Wildkin; all asset gameplay settings stay intact.
    section.props.push({ id: 'g2i-mossling', subtype: 'visualAsset', visualAssetId: 'asset_wildkin_mossling',
      pos: point(-10, 29.5), rotY: Math.PI, uniformScale: 1, visibleInPlay: true, collisionEnabled: true });
  }
  return { world, feet, facingYaw: Math.PI };
}

export function grantG2IPrerequisites(progress, scenario) {
  if (scenario !== 3) return;
  // Grant presentation supplies, then use the ordinary crafting/inventory transaction.
  const recipe = FIELD_RECIPE_BY_ID.berry_lure;
  const granted = progress.collectResources(recipe.cost);
  const crafted = progress.craftFieldSupply('berry_lure');
  if (!granted.ok || !crafted.crafted) throw new Error('Could not prepare the disposable berry lure.');
}

export function g2iScenarioUrl(href, scenario) {
  const url = new URL(href);
  url.searchParams.set('g2i', '1'); url.searchParams.set('scenario', String(scenario));
  url.searchParams.delete('dev'); url.searchParams.delete('author'); url.searchParams.delete('scout');
  return url.href;
}

export function createG2IPanel({ app, config, getPlayerState, getTamingState }) {
  if (!config.enabled) return { update() {}, destroy() {} };
  const panel = document.createElement('aside');
  panel.id = 'g2i-playtest-lab'; panel.dataset.uiControl = 'g2i';
  panel.style.cssText = 'position:absolute;right:12px;top:160px;z-index:9;width:300px;max-height:calc(100% - 350px);overflow:auto;padding:12px;border:1px solid #9bbbad;border-radius:12px;background:#102e37ed;color:#f4fff8;font:13px/1.4 system-ui;pointer-events:auto;';
  const style = document.createElement('style');
  style.textContent = '@media(max-width:899px){#g2i-playtest-lab{display:none}}';
  panel.append(style);
  const title = document.createElement('strong'); title.textContent = 'DEMO / EVALUATION SETUP — production mechanics'; panel.append(title);
  const setup = document.createElement('p'); setup.textContent = 'Disposable encounter + teleport. Fresh page on reset; normal saves/settings untouched. Real health, AI, inputs and timing.'; panel.append(setup);
  for (let i = 1; i <= 3; i++) {
    const b = document.createElement('button'); b.textContent = G2I_SCENARIOS[i - 1];
    b.setAttribute('aria-pressed', String(i === config.scenario));
    b.onclick = () => location.assign(g2iScenarioUrl(location.href, i)); panel.append(b);
  }
  const reset = document.createElement('button'); reset.textContent = 'Reset Scenario';
  reset.onclick = () => location.assign(g2iScenarioUrl(location.href, config.scenario)); panel.append(reset);
  const note = document.createElement('div');
  if (config.scenario === 1) note.textContent = 'Earlier implementation: combat globally suppressed Auto Harvest.\nHuman playtest decision: this interrupted gathering unnecessarily.\nRevised requirement: harvesting remains available; a physical tool swing may interact with valid resources and creatures in its arc.\nHistorical account: PLAYTEST_NOTES.md. Only the current implementation runs here.\nStop beside the gray rock; Auto Harvest ON. F = swing / hold to repeat. R = dodge.';
  if (config.scenario === 2) note.textContent = 'TECHNICAL CHECK\nDodge input recognized; gameplay state changes; cooldown/repeat behavior operates. Check these live below; not a player-quality PASS.\nHUMAN REVIEW\nDoes this actually feel responsive, readable and useful during play?\nFOLLOW-UP\nRecord specific observed problems before requesting another implementation pass.\nWASD = move; Shift = run; Space = jump; R = dodge.';
  if (config.scenario === 3) note.textContent = 'Setup grant: one berry lure (not earned).\nInitial starter interaction exposed a narrow approach window: quiet detection ~6.8 m while offer range was 6 m.\nHuman playtesting increased the starter Mossling offer range to 7.5 m (provisional tuning; not final owner acceptance).\nClick bottom quick slot 3 (berry lure), then F / PLACE LURE beside Mossling. Back away until GIVE SPACE changes; wait for feeding, then hold C + W to approach gently and click BOND. This is the real taming flow. Optional recording example.';
  note.style.cssText = 'white-space:pre-line;margin-top:10px'; panel.append(note);
  const live = document.createElement('p'); live.id = 'g2i-live-state'; panel.append(live);
  const exit = document.createElement('a'); exit.href = './'; exit.textContent = 'Ordinary play (normal save)'; exit.style.color = '#b8e6d3'; panel.append(exit);
  for (const b of panel.querySelectorAll('button')) b.style.cssText = 'display:block;width:100%;min-height:32px;margin-top:5px;border:1px solid #8bada0;border-radius:6px;background:#24483f;color:#fff;font:inherit;cursor:pointer';
  app.append(panel);
  let last = '', elapsed = 0, dodges = 0, previousMode = '';
  return {
    update(dt) {
      elapsed += dt; const state = getPlayerState();
      if (state.mode === 'DODGE' && previousMode !== 'DODGE') dodges++;
      previousMode = state.mode;
      if (elapsed < .1) return; elapsed = 0;
      const attempt = getTamingState();
      const text = config.scenario === 3 ? `Production taming: ${attempt?.stage ?? 'no active attempt'}`
        : `Live state: ${state.mode} · dodge entries ${dodges} · cooldown ${state.dodgeCooldown.toFixed(2)} s`;
      if (text !== last) { live.textContent = text; last = text; }
    },
    destroy() { panel.remove(); },
  };
}
