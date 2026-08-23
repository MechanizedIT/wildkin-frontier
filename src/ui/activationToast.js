// src/ui/activationToast.js — nonblocking activation feedback (Phase 4A.2)
import * as THREE from "three";

export function createActivationToast(scene, camera, audio) {
  const app = document.getElementById("app");
  let toastEl = null;
  if (app) {
    toastEl = document.createElement("div");
    toastEl.id = "activation-toast";
    toastEl.style.cssText = "position:absolute;left:50%;top:22%;transform:translateX(-50%) translateY(12px);background:rgba(14,20,32,0.92);color:#e6ebf5;border:1px solid rgba(79,195,247,0.35);border-radius:12px;padding:10px 14px;font-size:13px;font-weight:800;letter-spacing:0.04em;text-align:center;opacity:0;transition:opacity 0.22s, transform 0.22s;pointer-events:none;z-index:9;backdrop-filter:blur(6px);max-width:86vw;";
    app.appendChild(toastEl);
  }

  function show({ displayName, type }) {
    if (!toastEl) return;
    const isWaypoint = type === "majorWaypoint";
    const title = isWaypoint ? `${displayName.toUpperCase()} ACTIVATED` : `${displayName.toUpperCase()} ONLINE`;
    const subtitle = isWaypoint ? "New expedition start unlocked" : "Extraction available";
    toastEl.innerHTML = `<div style="font-size:13px;font-weight:900;letter-spacing:0.06em;">${title}</div><div style="font-size:11px;font-weight:600;color:rgba(230,235,245,0.78);margin-top:2px;">${subtitle}</div>`;
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(-50%) translateY(12px)";
    }, 2200);
  }

  // In-world pulse: emissive ring + brief scale
  function pulseWorld(pos, color = 0x4fc3f7) {
    if (!scene) return;
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 18);
    const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI/2;
    ring.position.set(pos.x, 0.08, pos.z);
    scene.add(ring);
    let t = 0;
    const start = performance.now();
    function anim() {
      const dt = (performance.now() - start) / 1000;
      const scale = 1 + dt * 2.2;
      ring.scale.set(scale, scale, 1);
      mat.opacity = Math.max(0, 0.85 - dt*0.95);
      if (dt < 1.0) requestAnimationFrame(anim);
      else scene.remove(ring);
    }
    requestAnimationFrame(anim);
    // sound
    try { audio?.playActivation?.(color === 0xff7043 ? "beacon" : "waypoint"); } catch {}
  }

  return { show, pulseWorld };
}
