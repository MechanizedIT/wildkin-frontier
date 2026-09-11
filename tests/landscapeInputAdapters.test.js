import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGameCameraOrbit } from "../src/input/gameCameraOrbit.js";
import { createTouchMovement } from "../src/input/touchMovement.js";
import { createKeyboardInput } from "../src/input/keyboardInput.js";
import { INPUT_CONFIG, MOVEMENT_CONFIG } from "../src/game/config.js";

function eventTarget() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, handler) { (listeners.get(type) ?? listeners.set(type, []).get(type)).push(handler); },
    removeEventListener(type, handler) { listeners.set(type, (listeners.get(type) ?? []).filter(h => h !== handler)); },
    dispatch(type, event = {}) { for (const handler of listeners.get(type) ?? []) handler({ cancelable: true, preventDefault() {}, target: { closest: () => null }, ...event }); },
  };
}

function appTarget() {
  const app = eventTarget();
  app.appendChild = () => {};
  app.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400 });
  app.setPointerCapture = () => {};
  app.releasePointerCapture = () => {};
  return app;
}

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
afterEach(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });

function setup() {
  const windowTarget = eventTarget();
  const documentTarget = eventTarget();
  documentTarget.getElementById = () => null;
  documentTarget.createElement = () => ({ style: {}, appendChild() {} });
  globalThis.window = windowTarget;
  globalThis.document = documentTarget;
  const app = appTarget();
  const camera = { yaw: 0, orbitBy(delta) { this.yaw += delta; }, getYaw() { return this.yaw; } };
  return { app, camera, windowTarget, documentTarget };
}

describe("landscape input adapters", () => {
  it("ignores right pointers while disabled by a modal or Author mode", () => {
    const { app, camera } = setup();
    const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
    const orbit = createGameCameraOrbit(app, camera, { yawSensitivity: .01 });
    touch.setEnabled(false); orbit.setEnabled(false);
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 1, button: 0, clientX: 700, clientY: 200 });
    app.dispatch("pointermove", { pointerType: "touch", pointerId: 1, clientX: 760, clientY: 200 });
    assert.equal(camera.yaw, 0);
    assert.equal(touch.getIntent().moveMagnitude, 0);
    orbit.setEnabled(true); touch.setEnabled(true);
    // Author-mode suppression uses the same input disable seam.
    touch.setEnabled(false); orbit.setEnabled(false);
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 2, button: 0, clientX: 700, clientY: 200 });
    assert.equal(camera.yaw, 0);
  });

  it("keeps a left joystick active while a second right pointer orbits", () => {
    const { app, camera } = setup();
    const touch = createTouchMovement(app, MOVEMENT_CONFIG, INPUT_CONFIG);
    createGameCameraOrbit(app, camera, { yawSensitivity: .01 });
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 10, button: 0, clientX: 130, clientY: 300 });
    app.dispatch("pointermove", { pointerType: "touch", pointerId: 10, clientX: 170, clientY: 300 });
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 11, button: 0, clientX: 650, clientY: 180 });
    app.dispatch("pointermove", { pointerType: "touch", pointerId: 11, clientX: 710, clientY: 180 });
    assert.ok(touch.getIntent().moveMagnitude > .1);
    assert.equal(camera.yaw, -.6);
  });

  it("never converts a right mouse drag into an attack", () => {
    const { app, camera } = setup();
    const keyboard = createKeyboardInput(MOVEMENT_CONFIG, app);
    createGameCameraOrbit(app, camera, { yawSensitivity: .01 });
    app.dispatch("pointerdown", { pointerType: "mouse", pointerId: 20, button: 0, clientX: 600, clientY: 200 });
    app.dispatch("pointermove", { pointerType: "mouse", pointerId: 20, clientX: 660, clientY: 200 });
    app.dispatch("pointerup", { pointerType: "mouse", pointerId: 20, button: 0, clientX: 660, clientY: 200 });
    assert.equal(keyboard._attackPending, false);
    assert.equal(camera.yaw, -.6);
  });

  it("clears an orbit pointer on cancel, blur, and hidden visibility", () => {
    const { app, camera, windowTarget, documentTarget } = setup();
    const orbit = createGameCameraOrbit(app, camera, { yawSensitivity: .01 });
    const begin = id => app.dispatch("pointerdown", { pointerType: "touch", pointerId: id, button: 0, clientX: 650, clientY: 200 });
    begin(30); app.dispatch("pointercancel", { pointerId: 30 });
    assert.equal(orbit._debug().pointerId, null);
    begin(31); windowTarget.dispatch("blur");
    assert.equal(orbit._debug().pointerId, null);
    begin(32); documentTarget.hidden = true; documentTarget.dispatch("visibilitychange");
    assert.equal(orbit._debug().pointerId, null);
  });
});
