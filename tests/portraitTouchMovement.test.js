import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchMovement, getTouchJoystickLayout } from '../src/input/touchMovement.js';
import { INPUT_CONFIG, MOVEMENT_CONFIG } from '../src/game/config.js';

function eventTarget() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, handler) { (listeners.get(type) ?? listeners.set(type, []).get(type)).push(handler); },
    removeEventListener(type, handler) { listeners.set(type, (listeners.get(type) ?? []).filter(candidate => candidate !== handler)); },
    dispatch(type, event = {}) { for (const handler of listeners.get(type) ?? []) handler({ cancelable: true, preventDefault() {}, target: { closest: () => null }, ...event }); },
    listenerCount(type) { return (listeners.get(type) ?? []).length; },
  };
}

function setup(width = 390, height = 844) {
  let bounds = { left: 0, top: 0, width, height };
  const windowTarget = eventTarget();
  windowTarget.matchMedia = () => ({ matches: false });
  windowTarget.visualViewport = eventTarget();
  const documentTarget = eventTarget();
  documentTarget.getElementById = () => null;
  documentTarget.createElement = () => ({ style: {}, children: [], appendChild(child) { this.children.push(child); } });
  const app = eventTarget();
  app.children = [];
  app.appendChild = child => app.children.push(child);
  app.getBoundingClientRect = () => ({ ...bounds });
  app.setPointerCapture = () => {};
  app.releasePointerCapture = () => {};
  globalThis.window = windowTarget;
  globalThis.document = documentTarget;
  return { app, windowTarget, documentTarget, setBounds(next) { bounds = { ...next }; } };
}

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
afterEach(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });

test('portrait joystick has one fixed visible center even with a fine pointer', () => {
  const { app } = setup();
  const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
  assert.deepEqual(getTouchJoystickLayout(app.getBoundingClientRect(), 68), {
    portrait: true, radius: 54, center: { x: 74, y: 672 }, activationRadius: 80,
  });
  assert.equal(touch._debug().layout.portrait, true);
  const layer = app.children[0];
  assert.equal(layer.style.display, 'block');
  assert.equal(layer.style.opacity, '.48');
  assert.equal(layer.children[0].style.left, '74px');
  assert.equal(layer.children[0].style.top, '672px');
  assert.equal(layer.children[0].style.width, '108px');
  assert.equal(layer.children[1].style.width, `${44 * 54 / 68}px`);
  touch.destroy();
});

test('portrait touch and pen start only around the fixed stick and preserve movement bands', () => {
  const { app } = setup();
  const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
  const down = (id, x, y, pointerType = 'touch') => app.dispatch('pointerdown', { pointerType, pointerId: id, button: 0, clientX: x, clientY: y });
  const move = (id, x, y, pointerType = 'touch') => app.dispatch('pointermove', { pointerType, pointerId: id, clientX: x, clientY: y });

  down(1, 190, 500);
  assert.equal(touch._debug().hasActive, false, 'an unrelated left-side world touch is ignored');
  down(2, 74, 672);
  assert.deepEqual(touch._debug().origin, { x: 74, y: 672 });
  move(2, 74 + 54 * .25, 672);
  assert.equal(touch.getIntent().movementBand, 'sneak');
  move(2, 74 + 54 * .55, 672);
  assert.equal(touch.getIntent().movementBand, 'walk');
  move(2, 74 + 54 * .9, 672);
  assert.equal(touch.getIntent().movementBand, 'run');
  assert.ok(touch.getIntent().moveX > .99);
  app.dispatch('pointercancel', { pointerType: 'touch', pointerId: 2 });
  assert.equal(touch.getIntent().moveMagnitude, 0);

  down(3, 70, 669, 'pen');
  assert.equal(touch._debug().hasActive, true);
  app.dispatch('pointerup', { pointerType: 'pen', pointerId: 3 });
  touch.destroy();
});

test('orientation change cancels held portrait movement and restores landscape floating behavior', () => {
  const { app, windowTarget, setBounds } = setup();
  const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
  app.dispatch('pointerdown', { pointerType: 'touch', pointerId: 4, button: 0, clientX: 74, clientY: 672 });
  app.dispatch('pointermove', { pointerType: 'touch', pointerId: 4, clientX: 120, clientY: 672 });
  assert.ok(touch.getIntent().moveMagnitude > .8);
  setBounds({ left: 0, top: 0, width: 844, height: 390 });
  windowTarget.dispatch('resize');
  assert.equal(touch.getIntent().moveMagnitude, 0);
  assert.equal(touch._debug().layout.portrait, false);
  app.dispatch('pointerdown', { pointerType: 'touch', pointerId: 5, button: 0, clientX: 120, clientY: 300 });
  assert.deepEqual(touch._debug().origin, { x: 120, y: 300 }, 'landscape retains its floating origin');
  touch.destroy();
});

test('visual viewport resize cancels movement, refreshes the fixed cue, and unregisters on destroy', () => {
  const { app, windowTarget, setBounds } = setup();
  const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
  assert.equal(windowTarget.visualViewport.listenerCount('resize'), 1);

  app.dispatch('pointerdown', { pointerType: 'touch', pointerId: 6, button: 0, clientX: 74, clientY: 672 });
  app.dispatch('pointermove', { pointerType: 'touch', pointerId: 6, clientX: 120, clientY: 672 });
  assert.ok(touch.getIntent().moveMagnitude > .8);
  setBounds({ left: 0, top: 0, width: 430, height: 760 });
  windowTarget.visualViewport.dispatch('resize');

  assert.equal(touch.getIntent().moveMagnitude, 0);
  assert.deepEqual(touch._debug().layout.center, { x: 74, y: 588 });
  assert.equal(app.children[0].children[0].style.top, '588px');

  touch.destroy();
  assert.equal(windowTarget.visualViewport.listenerCount('resize'), 0);
});
