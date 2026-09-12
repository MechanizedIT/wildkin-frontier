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
  const camera = { yaw: 0, pitch: 0, zoom:1, zoomByFactor(factor){this.zoom*=factor;}, orbitBy(yawDelta, pitchDelta = 0) { this.yaw += yawDelta; this.pitch += pitchDelta; }, getYaw() { return this.yaw; }, getPitch() { return this.pitch; } };
  return { app, camera, windowTarget, documentTarget };
}

describe("landscape input adapters", () => {
  it('losing the owned joystick capture clears movement while unrelated capture loss does not',()=>{
    const {app}=setup(),touch=createTouchMovement(app,MOVEMENT_CONFIG,INPUT_CONFIG);
    app.dispatch('pointerdown',{pointerType:'touch',pointerId:1,clientX:100,clientY:300});
    app.dispatch('pointermove',{pointerType:'touch',pointerId:1,clientX:150,clientY:300});
    app.dispatch('lostpointercapture',{pointerId:2});assert.ok(touch.getIntent().moveMagnitude>.5);
    app.dispatch('lostpointercapture',{pointerId:1});assert.equal(touch.getIntent().moveMagnitude,0);
  });
  it('viewport resize abandons pinch coordinates and ignores old fingers until fresh touch down',()=>{
    const {app,camera,windowTarget}=setup(),orbit=createGameCameraOrbit(app,camera);
    for(const [id,x]of [[1,550],[2,650]])app.dispatch('pointerdown',{pointerType:'touch',pointerId:id,clientX:x,clientY:200});
    assert.equal(orbit._debug().pinch,true);windowTarget.dispatch('resize');
    app.dispatch('pointermove',{pointerType:'touch',pointerId:2,clientX:325,clientY:320});
    assert.equal(camera.zoom,1);assert.equal(camera.yaw,0);assert.equal(orbit._debug().pointerId,null);
  });
  it('two right-side touches zoom without stealing a live left joystick or rotating during pinch',()=>{
    const {app,camera}=setup();
    const touch=createTouchMovement(app,MOVEMENT_CONFIG,INPUT_CONFIG);
    const orbit=createGameCameraOrbit(app,camera,{yawSensitivity:.01});
    const down=(id,x,y)=>app.dispatch('pointerdown',{pointerType:'touch',pointerId:id,button:0,clientX:x,clientY:y});
    const move=(id,x,y)=>app.dispatch('pointermove',{pointerType:'touch',pointerId:id,clientX:x,clientY:y});
    down(1,100,300);move(1,150,300);const magnitude=touch.getIntent().moveMagnitude;
    down(2,550,160);down(3,650,160);move(3,750,160);
    assert.equal(camera.zoom,.5);assert.equal(camera.yaw,0);assert.equal(touch.getIntent().moveMagnitude,magnitude);
    // A remaining finger resumes orbit from its current position, no jump.
    app.dispatch('pointerup',{pointerType:'touch',pointerId:2});move(3,760,160);
    assert.equal(camera.yaw,-.1);assert.equal(orbit._debug().pinch,false);
    orbit.setEnabled(false);move(3,780,160);assert.equal(camera.yaw,-.1);
  });
  it('UI touches and left-to-right joystick crossing never become pinch fingers',()=>{
    const {app,camera}=setup();createTouchMovement(app,MOVEMENT_CONFIG,INPUT_CONFIG);
    const orbit=createGameCameraOrbit(app,camera,{yawSensitivity:.01});
    app.dispatch('pointerdown',{pointerType:'touch',pointerId:1,clientX:100,clientY:300});
    app.dispatch('pointermove',{pointerType:'touch',pointerId:1,clientX:600,clientY:300});
    app.dispatch('pointerdown',{pointerType:'touch',pointerId:2,clientX:600,clientY:200});
    app.dispatch('pointerdown',{pointerType:'touch',pointerId:3,clientX:700,clientY:200,target:{closest:()=>({})}});
    app.dispatch('pointermove',{pointerType:'touch',pointerId:2,clientX:620,clientY:200});
    assert.equal(camera.zoom,1);assert.equal(camera.yaw,-.2);assert.equal(orbit._debug().pinch,false);
  });
  it('wheel zoom ignores UI, left controls and disabled camera input',()=>{
    const {app,camera}=setup(),orbit=createGameCameraOrbit(app,camera);
    const wheel=extra=>app.dispatch('wheel',{clientX:600,clientY:150,deltaY:100,deltaMode:0,...extra});
    wheel({clientX:100});wheel({target:{closest:()=>({})}});assert.equal(camera.zoom,1);
    wheel({});assert.ok(camera.zoom>1);const zoom=camera.zoom;
    orbit.setEnabled(false);wheel({});assert.equal(camera.zoom,zoom);
  });
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

  it("uses vertical right-side drag for bounded camera pitch without affecting pinch ownership", () => {
    const { app, camera } = setup();
    createGameCameraOrbit(app, camera, { yawSensitivity: .01, pitchSensitivity: .02 });
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 40, button: 0, clientX: 650, clientY: 180 });
    app.dispatch("pointermove", { pointerType: "touch", pointerId: 40, clientX: 680, clientY: 200 });
    assert.equal(camera.yaw, -.3);
    assert.equal(camera.pitch, -.4);
    app.dispatch("pointerdown", { pointerType: "touch", pointerId: 41, button: 0, clientX: 740, clientY: 180 });
    app.dispatch("pointermove", { pointerType: "touch", pointerId: 41, clientX: 760, clientY: 260 });
    assert.equal(camera.pitch, -.4, "two-finger pinch cannot also orbit pitch");
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
