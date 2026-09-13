import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRunInventoryHud, RUN_INVENTORY_RECENT_MS } from '../src/ui/runInventoryHud.js';

class ClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  set(value) { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
}

class Element {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.parent = null; this.classList = new ClassList(); this.dataset = {}; this.style = {}; this.hidden = false; this.removed = false; this.countNode = null; }
  set className(value) { this.classList.set(value); }
  get className() { return [...this.classList.values].join(' '); }
  set innerHTML(value) { if (value.includes('data-count')) this.countNode = { textContent: '' }; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  querySelector(selector) { return selector === '[data-count]' ? this.countNode : null; }
  setAttribute() {}
  remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  get offsetWidth() { return 1; }
}

function clock() {
  let now = 0, id = 0;
  const timers = new Map(), frames = new Map();
  const setTimeoutFn = (fn, delay) => { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; };
  const clearTimeoutFn = key => timers.delete(key);
  const requestFrame = fn => { const key = ++id; frames.set(key, fn); return key; };
  const cancelFrame = key => frames.delete(key);
  const flushFrames = () => { const ready = [...frames.values()]; frames.clear(); ready.forEach(fn => fn(now)); };
  const tick = delta => {
    now += delta;
    let ready;
    do {
      ready = [...timers].filter(([, task]) => task.at <= now).sort((a, b) => a[1].at - b[1].at);
      for (const [key, task] of ready) { timers.delete(key); task.fn(); }
    } while (ready.length);
  };
  return { setTimeoutFn, clearTimeoutFn, requestFrame, cancelFrame,
    flushFrames, tick, pending: () => timers.size + frames.size };
}

test('portrait carried rows show only a refreshed recent nonzero pulse and release resource, XP and gain callbacks', async () => {
  const priorDocument = globalThis.document;
  const hud = new Element('div'); hud.id = 'hud';
  const document = {
    createElement: tag => new Element(tag),
    getElementById(id) {
      const find = node => node.id === id ? node : node.children.map(find).find(Boolean);
      return find(hud) ?? null;
    },
  };
  globalThis.document = document;
  const time = clock();
  try {
    const view = createRunInventoryHud([{ id: 'wood', displayName: 'Wood' }], { timingOptions: time });
    view.update({ wood: 4 }, 0);
    assert.equal(view.rows.wood.hidden, false);
    assert.equal(view.rows.wood.classList.contains('is-recent'), false, 'loaded positive counts are landscape-persistent but not portrait-recent');

    view.pulse('wood'); time.flushFrames();
    assert.equal(view.rows.wood.classList.contains('is-recent'), true);
    time.tick(RUN_INVENTORY_RECENT_MS - 100);
    view.pulse('wood');
    time.tick(200);
    assert.equal(view.rows.wood.classList.contains('is-recent'), true, 'a second pulse cancels the first expiry');
    time.tick(RUN_INVENTORY_RECENT_MS - 199);
    assert.equal(view.rows.wood.classList.contains('is-recent'), false);
    assert.equal(time.pending(), 0, 'gain expiry cancels its frame when a hidden page never presents it');

    view.pulse('wood');
    view.update({ wood: 0 }, 0);
    assert.equal(view.rows.wood.hidden, true);
    assert.equal(view.rows.wood.classList.contains('is-recent'), false, 'zeroing a resource immediately clears portrait recency');

    view.update({ wood: 0 }, 3);
    view.pulseXp(); time.flushFrames();
    assert.equal(view.rows.xp.querySelector('[data-count]').textContent, '3');
    assert.equal(view.rows.xp.classList.contains('is-recent'), true, 'XP shares the same transient row contract');
    view.destroy();
    assert.equal(view.element.removed, true);
    assert.equal(view.rows.xp.classList.contains('is-recent'), false);
    assert.equal(time.pending(), 0, 'destroy cancels row expiry, gain removal and queued animation frames');

    const css = await readFile(new URL('../styles/portrait.css', import.meta.url), 'utf8');
    assert.match(css, /@media \(orientation:portrait\)[\s\S]*run-inventory-hud__item:not\(\.is-recent\)\s*\{\s*display:none!important/);
  } finally {
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
  }
});
