import { drawFrontierAtlas } from './frontierAtlasRenderer.js';

const STYLE_ID = 'frontier-atlas-style';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style'); style.id = STYLE_ID;
  style.textContent = `
    #frontier-map-button.frontier-atlas-button{overflow:hidden;position:absolute;display:grid!important;place-items:center;top:max(14px,env(safe-area-inset-top))!important;right:max(14px,env(safe-area-inset-right))!important;width:104px!important;min-width:104px!important;height:104px!important;min-height:104px!important;padding:3px!important}
    .frontier-atlas-button canvas{width:96px;height:96px;border-radius:9px;image-rendering:pixelated;pointer-events:none}.frontier-atlas-button::after{content:""!important;display:none!important}.viewport-fullscreen{top:max(14px,env(safe-area-inset-top))!important;right:calc(max(14px,env(safe-area-inset-right)) + 124px)!important}#auto-harvest-toggle{top:max(126px,calc(env(safe-area-inset-top) + 126px))!important}#hud-stack{top:max(204px,calc(env(safe-area-inset-top) + 204px))!important}
    #frontier-map-overlay .frontier-atlas-card{width:min(940px,96vw)!important;max-height:94dvh;padding:16px 18px 13px;text-align:left}
    .frontier-atlas-card header{padding:0 0 10px;border-bottom:2px solid #bdd1ca}.frontier-atlas-card h2{font-size:29px;margin:0}.frontier-atlas-kicker{font:900 10px/1 Nunito,sans-serif;letter-spacing:.13em;color:#0a716e}
    .frontier-atlas-stage{position:relative;height:min(62dvh,560px);min-height:260px;margin-top:12px;overflow:hidden;border:4px solid #153b4a;background:#082c3a;touch-action:none}
    .frontier-atlas-stage canvas{display:block;width:100%;height:100%;image-rendering:pixelated}.frontier-atlas-north{position:absolute;top:14px;left:15px;color:#fff6df;font:900 16px/1 Nunito;text-align:center;text-shadow:0 2px #08212b;pointer-events:none}.frontier-atlas-north i{display:block;margin:7px auto 0;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:24px solid #fff6df;filter:drop-shadow(0 2px #08212b)}
    .frontier-atlas-controls{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:8px}.frontier-atlas-controls button{width:46px;min-height:46px;border:2px solid #fdf1d4;border-radius:50%;background:#0b3b4a;color:#fff9e9;font:900 29px/1 Nunito;box-shadow:0 2px #061b24}.frontier-atlas-controls button:last-child{font-size:22px}
    .frontier-atlas-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 1px 0;color:#102b39;font-weight:900}.frontier-atlas-distance{font-size:16px}.frontier-atlas-scale{display:flex;flex-direction:column;align-items:center;font-size:11px;min-width:94px}.frontier-atlas-scale i{display:block;width:90px;height:7px;border-left:3px solid #153b4a;border-right:3px solid #153b4a;border-bottom:3px solid #153b4a}.frontier-atlas-key{display:flex;align-items:center;gap:9px;font-size:11px;color:#45616a}.frontier-atlas-key span{display:flex;align-items:center;gap:4px}.frontier-atlas-key i{display:block;width:10px;height:10px;border:1px solid #173b48;border-radius:50%}.frontier-atlas-key .camp{background:#ffc654}.frontier-atlas-key .you{background:#4be0d4}.frontier-atlas-key .fog{background:#082c3a}
    @media (max-width:520px){#frontier-map-overlay .frontier-atlas-card{padding:13px;width:min(98vw,940px)!important}.frontier-atlas-card h2{font-size:25px}.frontier-atlas-stage{height:54dvh;min-height:245px}.frontier-atlas-footer{align-items:flex-end}.frontier-atlas-key{display:none}.frontier-atlas-controls{right:8px;top:8px}.frontier-atlas-controls button{width:44px;min-height:44px}}
    @media (orientation:landscape) and (max-height:520px){#frontier-map-button.frontier-atlas-button{width:86px!important;min-width:86px!important;height:86px!important;min-height:86px!important}.frontier-atlas-button canvas{width:78px;height:78px}.viewport-fullscreen{right:calc(max(14px,env(safe-area-inset-right)) + 106px)!important}#auto-harvest-toggle{top:max(102px,calc(env(safe-area-inset-top) + 102px))!important}#hud-stack{top:max(74px,calc(env(safe-area-inset-top) + 74px))!important;right:calc(max(14px,env(safe-area-inset-right)) + 92px)!important;max-height:min(112px,calc(100dvh - 210px))!important;overflow:hidden}#frontier-map-overlay .frontier-atlas-card{width:min(96vw,940px)!important;max-height:96dvh;padding:10px 14px}.frontier-atlas-card header{padding-bottom:5px}.frontier-atlas-stage{height:min(62dvh,390px);min-height:200px;margin-top:7px}.frontier-atlas-footer{padding-top:6px}}
  `; document.head.append(style);
}

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; return true; }
  return false;
}

/** Personal atlas surface. Legacy start-selection intentionally aliases inspection. */
export function createFrontierMap(opts = {}) {
  const app = document.getElementById('app');
  if (!app) return { openInspect() {}, openStartSelection() {}, close() {}, isOpen: () => false, getMode: () => null, setEnabled() {}, buildList() {}, destroy() {} };
  installStyles();
  const mapButton = document.createElement('button'); mapButton.id = 'frontier-map-button'; mapButton.className = 'frontier-atlas-button'; mapButton.type = 'button'; mapButton.setAttribute('aria-label', 'Open Field Atlas');
  const miniCanvas = document.createElement('canvas'); miniCanvas.width = miniCanvas.height = 96; mapButton.append(miniCanvas);
  const overlay = document.createElement('div'); overlay.id = 'frontier-map-overlay'; overlay.className = 'frontier-overlay'; overlay.style.display = 'none';
  overlay.innerHTML = `<section id="frontier-map-panel" class="frontier-card frontier-atlas-card" role="dialog" aria-modal="true" aria-label="Field Atlas"><header><div><div class="frontier-atlas-kicker">PERSONAL SURVEY</div><h2>Field Atlas</h2></div><button class="frontier-close" aria-label="Close Field Atlas">×</button></header><div class="frontier-atlas-stage"><canvas aria-label="Surveyed terrain map"></canvas><div class="frontier-atlas-north">N<i></i></div><div class="frontier-atlas-controls"><button data-atlas-zoom="in" aria-label="Zoom in">+</button><button data-atlas-zoom="out" aria-label="Zoom out">−</button><button data-atlas-recenter aria-label="Recenter on current position">⌾</button></div></div><footer class="frontier-atlas-footer"><strong class="frontier-atlas-distance">Camp · 0 m</strong><span class="frontier-atlas-scale"><i></i><b>50 m</b></span><span class="frontier-atlas-key"><span><i class="camp"></i>Camp</span><span><i class="you"></i>You</span><span><i class="fog"></i>Uncharted</span></span></footer></section>`;
  app.append(mapButton, overlay);
  const canvas = overlay.querySelector('canvas'), ctx = canvas.getContext('2d'), miniCtx = miniCanvas.getContext('2d'), distLabel = overlay.querySelector('.frontier-atlas-distance'), scaleLabel = overlay.querySelector('.frontier-atlas-scale b'), scaleBar = overlay.querySelector('.frontier-atlas-scale i');
  let opened = false, enabled = true, mode = null, previousFocus = null, elapsed = 1, dirty = true, center = null, metersPerPixel = .24, dragging = null, lastAtlas = null;
  const camp = () => opts.worldRegistry?.getCampSpawnPosition?.() ?? opts.worldRegistry?.getCamp?.()?.pos ?? { x: 0, z: 0 };
  const player = () => opts.getPlayerPos?.() ?? { x: 0, z: 0 };
  const atlas = () => opts.frontierProgress?.getFrontierAtlasState?.() ?? { chunks: {} };
  const terrain = (x, z) => opts.getTerrainSample?.(x, z) ?? undefined;
  function renderCanvas(targetCtx, width, height, mini = false) {
    const current = player(), state = atlas(), anchor = center ?? current;
    const pixelRatio = mini ? 1 : width / Math.max(1, canvas.getBoundingClientRect().width);
    drawFrontierAtlas(targetCtx, { width, height, atlas: state, centerX: mini ? current.x : anchor.x, centerZ: mini ? current.z : anchor.z, metersPerPixel: mini ? 1.15 : metersPerPixel, player: current, playerYaw: opts.getPlayerYaw?.() ?? 0, camp: camp(), getTerrainSample: terrain, pixelRatio });
    return state;
  }
  function render(force = false) {
    const changedSize = sizeCanvas(canvas), currentAtlas = atlas();
    // Complete visible coverage matters more than seeing an arbitrarily wide
    // survey. Pan reaches farther terrain until a coarse future LOD exists.
    metersPerPixel = clamp(metersPerPixel, .075, Math.min(2.2, 300 / Math.max(canvas.width, canvas.height)));
    if (!force && !dirty && !changedSize && currentAtlas === lastAtlas) return;
    lastAtlas = renderCanvas(ctx, canvas.width, canvas.height); dirty = false;
    const current = player(), c = camp(); distLabel.textContent = `Camp · ${Math.round(distance(current, c))} m`;
    const cssRatio = canvas.width / Math.max(1, canvas.getBoundingClientRect().width), metersPerCssPixel = metersPerPixel * cssRatio;
    const desiredMeters = 90 * metersPerCssPixel, power = 10 ** Math.floor(Math.log10(Math.max(1, desiredMeters)));
    const nice = [1, 2, 5, 10].map(unit => unit * power).filter(unit => unit <= desiredMeters).at(-1) ?? power;
    scaleLabel.textContent = `${nice} m`; scaleBar.style.width = `${nice / metersPerCssPixel}px`;
  }
  function renderMini() { renderCanvas(miniCtx, miniCanvas.width, miniCanvas.height, true); }
  function buildList() { dirty = true; if (opened) render(true); renderMini(); }
  function open() {
    if (opened || !enabled) return false;
    mode = 'inspect'; opened = true; previousFocus = document.activeElement; overlay.style.display = 'flex'; sizeCanvas(canvas);
    const current = player(), c = camp(), maxScale = Math.min(2.2, 300 / Math.max(canvas.width, canvas.height));
    const needed = Math.max((Math.abs(current.x - c.x) + 24) / canvas.width, (Math.abs(current.z - c.z) + 24) / canvas.height, .075);
    if (needed <= maxScale) { center = { x: (current.x + c.x) / 2, z: (current.z + c.z) / 2 }; metersPerPixel = needed; }
    else { center = { ...current }; metersPerPixel = maxScale; }
    dirty = true; render(true); opts.onOpen?.(mode); overlay.querySelector('.frontier-close').focus(); return true;
  }
  function close() { if (!opened) return false; overlay.style.display = 'none'; opened = false; mode = null; dragging = null; opts.onClose?.(); previousFocus?.focus?.(); return true; }
  function zoom(factor) { metersPerPixel = clamp(metersPerPixel * factor, .075, 2.2); dirty = true; render(true); }
  function recenter() { center = { ...player() }; dirty = true; render(true); }
  function point(event) { const r = canvas.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; }
  mapButton.addEventListener('click', () => opened ? close() : open()); overlay.querySelector('.frontier-close').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelector('[data-atlas-zoom="in"]').addEventListener('click', () => zoom(.72)); overlay.querySelector('[data-atlas-zoom="out"]').addEventListener('click', () => zoom(1.38)); overlay.querySelector('[data-atlas-recenter]').addEventListener('click', recenter);
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY < 0 ? .82 : 1.22); }, { passive: false });
  canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture?.(event.pointerId); dragging = point(event); });
  canvas.addEventListener('pointermove', event => { if (!dragging || !opened) return; const next = point(event), ratio = canvas.width / canvas.getBoundingClientRect().width; center ??= { ...player() }; center.x -= (next.x - dragging.x) * ratio * metersPerPixel; center.z -= (next.y - dragging.y) * ratio * metersPerPixel; dragging = next; dirty = true; render(true); });
  canvas.addEventListener('pointerup', () => { dragging = null; }); canvas.addEventListener('pointercancel', () => { dragging = null; });
  function key(event) { if (!opened) return; if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); return; } if (event.key === 'Tab') { const controls = [...overlay.querySelectorAll('button')], first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }
  window.addEventListener('keydown', key);
  return { openInspect: open, openStartSelection: open, close, isOpen: () => opened, getMode: () => mode, isEnabled: () => enabled, setEnabled(value) { enabled = !!value; mapButton.disabled = !enabled; }, buildList, update(dt = 0) { elapsed += Number(dt) || 0; if (elapsed < .2) return; elapsed = 0; renderMini(); if (opened) render(); }, element: overlay, button: mapButton, destroy() { window.removeEventListener('keydown', key); overlay.remove(); mapButton.remove(); } };
}
