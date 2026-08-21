// src/audio/gameAudio.js — procedural Web Audio for harvesting (offline, no assets)
export function createGameAudio() {
  let ctx = null;
  let unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (_) { ctx = null; }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    unlocked = true;
  }

  // attach one-time gesture unlock
  if (typeof window !== "undefined") {
    const handler = () => { unlock(); window.removeEventListener("pointerdown", handler); window.removeEventListener("keydown", handler); window.removeEventListener("touchstart", handler); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
  }

  function tone({ freq = 440, freq2, duration = 0.12, type = "sine", gain = 0.18, slide = 0, noise = 0 }) {
    const c = ensure();
    if (!c || c.state === "suspended" && !unlocked) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), now + duration * 0.9);
    else if (slide) osc.frequency.linearRampToValueAtTime(freq * slide, now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    if (noise > 0) {
      // brief filtered noise burst via buffer
      const len = Math.floor(c.sampleRate * Math.min(0.08, duration * 0.6));
      if (len > 0) {
        const buf = c.createBuffer(1, len, c.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * noise * (1 - i / len);
        const src = c.createBufferSource();
        src.buffer = buf;
        const fg = c.createGain();
        fg.gain.setValueAtTime(noise * 0.35, now);
        fg.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.5);
        src.connect(fg).connect(c.destination);
        src.start(now);
      }
    }
  }

  function playHarvest(type, isFinal) {
    if (type === "wood") {
      tone({ freq: 180, freq2: 95, duration: isFinal ? 0.22 : 0.14, type: "triangle", gain: isFinal ? 0.26 : 0.18, noise: 0.08 });
      if (isFinal) setTimeout(() => tone({ freq: 110, freq2: 60, duration: 0.18, type: "square", gain: 0.14 }), 70);
    } else if (type === "stone") {
      tone({ freq: 420, freq2: 220, duration: isFinal ? 0.20 : 0.11, type: "square", gain: isFinal ? 0.22 : 0.16, noise: 0.22 });
      if (isFinal) setTimeout(() => tone({ freq: 700, freq2: 120, duration: 0.12, type: "triangle", gain: 0.12 }), 55);
    } else {
      tone({ freq: 650, freq2: 880, duration: isFinal ? 0.16 : 0.10, type: "sine", gain: isFinal ? 0.20 : 0.14, slide: 1.15 });
      tone({ freq: 900, duration: 0.06, type: "triangle", gain: 0.08 });
    }
  }

  function playPickup(resourceId) {
    const map = { wood: 620, stone: 520, fiber: 740 };
    const f = map[resourceId] ?? 600;
    tone({ freq: f, freq2: f * 1.45, duration: 0.13, type: "sine", gain: 0.16 });
    setTimeout(() => tone({ freq: f * 1.6, duration: 0.09, type: "sine", gain: 0.10 }), 70);
  }

  function playDeplete() {
    tone({ freq: 180, freq2: 55, duration: 0.28, type: "triangle", gain: 0.22, noise: 0.06 });
  }

  return { ensure, unlock, playHarvest, playPickup, playDeplete, get context() { return ctx; } };
}
