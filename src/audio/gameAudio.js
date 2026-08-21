// src/audio/gameAudio.js — procedural Web Audio for harvesting (offline, no assets) — Phase 2.1 softer mix
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

  if (typeof window !== "undefined") {
    const handler = () => { unlock(); window.removeEventListener("pointerdown", handler); window.removeEventListener("keydown", handler); window.removeEventListener("touchstart", handler); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
  }

  function tone({ freq = 440, freq2, duration = 0.12, type = "sine", gain = 0.18, slide = 0, noise = 0, filterFreq }) {
    const c = ensure();
    if (!c || c.state === "suspended" && !unlocked) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(22, freq2), now + duration * 0.9);
    else if (slide) osc.frequency.linearRampToValueAtTime(freq * slide, now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    let last = osc;
    let filter = null;
    if (filterFreq) {
      filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFreq, now);
      osc.connect(filter);
      filter.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    if (noise > 0) {
      const len = Math.floor(c.sampleRate * Math.min(0.07, duration * 0.5));
      if (len > 0) {
        const buf = c.createBuffer(1, len, c.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * noise * (1 - i / len) * 0.55;
        const src = c.createBufferSource();
        src.buffer = buf;
        const fg = c.createGain();
        fg.gain.setValueAtTime(noise * 0.28, now);
        fg.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);
        // lowpass for softer
        const f2 = c.createBiquadFilter();
        f2.type = "lowpass";
        f2.frequency.setValueAtTime(2200, now);
        src.connect(f2).connect(fg).connect(c.destination);
        src.start(now);
      }
    }
  }

  function playWhoosh() {
    // Subtle whoosh: filtered noise + soft sine sweep, low gain
    const c = ensure();
    if (!c) return;
    // Use tone helper with noise primarily
    tone({ freq: 320, freq2: 180, duration: 0.16, type: "sine", gain: 0.055, filterFreq: 1200, noise: 0.045 });
    // second layer higher air
    setTimeout(() => tone({ freq: 480, freq2: 300, duration: 0.10, type: "triangle", gain: 0.035, filterFreq: 1800 }), 12);
  }

  function playHarvest(type, isFinal) {
    if (type === "wood") {
      // dull woody thunk — lower, softer, filtered, less electronic
      tone({ freq: 145, freq2: 78, duration: isFinal ? 0.20 : 0.13, type: "triangle", gain: isFinal ? 0.19 : 0.13, filterFreq: 1400, noise: 0.04 });
      tone({ freq: 92, duration: 0.09, type: "sine", gain: 0.07, filterFreq: 600 });
    } else if (type === "stone") {
      // crisp crack + short low body
      tone({ freq: 520, freq2: 280, duration: isFinal ? 0.16 : 0.10, type: "triangle", gain: isFinal ? 0.15 : 0.11, filterFreq: 2600, noise: 0.10 });
      tone({ freq: 118, freq2: 72, duration: isFinal ? 0.18 : 0.11, type: "sine", gain: isFinal ? 0.13 : 0.08, filterFreq: 700 });
    } else {
      // fiber light cut/swipe
      tone({ freq: 620, freq2: 740, duration: isFinal ? 0.14 : 0.10, type: "sine", gain: isFinal ? 0.12 : 0.085, filterFreq: 3200, noise: 0.025 });
      tone({ freq: 880, duration: 0.05, type: "triangle", gain: 0.045, filterFreq: 4800 });
    }
    if (isFinal) {
      setTimeout(() => tone({ freq: 88, freq2: 48, duration: 0.20, type: "sine", gain: 0.09, filterFreq: 900 }), 60);
    }
  }

  function playPickup(resourceId) {
    const map = { wood: 540, stone: 480, fiber: 680 };
    const f = map[resourceId] ?? 560;
    // softer, less piercing
    tone({ freq: f, freq2: f * 1.28, duration: 0.12, type: "sine", gain: 0.11, filterFreq: 2600 });
    setTimeout(() => tone({ freq: f * 1.45, duration: 0.07, type: "sine", gain: 0.06, filterFreq: 3000 }), 68);
  }

  function playDeplete() {
    tone({ freq: 140, freq2: 52, duration: 0.26, type: "triangle", gain: 0.14, filterFreq: 1100, noise: 0.03 });
  }

  return { ensure, unlock, playHarvest, playPickup, playDeplete, playWhoosh, get context() { return ctx; } };
}
