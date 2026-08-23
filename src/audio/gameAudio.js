// src/audio/gameAudio.js — procedural Web Audio for harvesting (offline, no assets) — Phase 2.2 louder mids
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

  function tone({ freq = 440, freq2, duration = 0.12, type = "sine", gain = 0.18, slide = 0, noise = 0, filterFreq, filterType = "lowpass", highpass }) {
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
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, now);
      if (filterType === "bandpass") filter.Q.setValueAtTime(1.1, now);
      osc.connect(filter);
      filter.connect(g);
    } else if (highpass) {
      filter = c.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(highpass, now);
      osc.connect(filter);
      filter.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    if (noise > 0) {
      const len = Math.floor(c.sampleRate * Math.min(0.12, duration * 0.85));
      if (len > 0) {
        const buf = c.createBuffer(1, len, c.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * noise * (1 - i / len) * 0.60;
        const src = c.createBufferSource();
        src.buffer = buf;
        const fg = c.createGain();
        fg.gain.setValueAtTime(noise * 0.35, now);
        fg.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);
        const f2 = c.createBiquadFilter();
        f2.type = "bandpass";
        f2.frequency.setValueAtTime(1150, now);
        f2.Q.setValueAtTime(0.9, now);
        // highpass to remove rumble
        const hp = c.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(500, now);
        src.connect(hp).connect(f2).connect(fg).connect(c.destination);
        src.start(now);
      }
    }
  }

  function whooshNoise({ duration = 0.18, gain = 0.22, bandFreq = 1100 }) {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended" && !unlocked) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = c.currentTime;
    const len = Math.floor(c.sampleRate * duration);
    if (len <= 0) return;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI); // swell
      ch[i] = (Math.random() * 2 - 1) * env * 0.95;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(bandFreq, now);
    bp.Q.setValueAtTime(0.78, now);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(bandFreq < 750 ? 180 : 320, now);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(hp).connect(bp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function playWhoosh() {
    const c = ensure();
    if (!c) return;
    // Final refinement: deeper WHOOOOSH — main energy 400-700 Hz, heavy sweep 420→190
    whooshNoise({ duration: 0.22, gain: 0.30, bandFreq: 520 });
    whooshNoise({ duration: 0.18, gain: 0.18, bandFreq: 680 });
    // Heavy pitched sweep 420 → ~190 Hz
    tone({ freq: 420, freq2: 190, duration: 0.20, type: "triangle", gain: 0.14, filterFreq: 900, filterType: "lowpass" });
    // One quiet air layer for phone definition, not dominant
    setTimeout(() => tone({ freq: 950, freq2: 820, duration: 0.10, type: "sine", gain: 0.045, filterFreq: 1400 }), 8);
  }

  function playHarvest(type, isFinal) {
    if (type === "wood") {
      // Phase 2.2: audible on phone — boosted mids, clear attack, body, click
      // Attack transient 250-500 Hz
      tone({ freq: 380, freq2: 220, duration: isFinal ? 0.18 : 0.11, type: "triangle", gain: isFinal ? 0.31 : 0.24, filterFreq: 1800 });
      // Body 100-180 Hz warm
      tone({ freq: 145, freq2: 95, duration: isFinal ? 0.22 : 0.14, type: "sine", gain: isFinal ? 0.20 : 0.14, filterFreq: 650 });
      // Woody click 600-900 Hz
      tone({ freq: 780, freq2: 520, duration: 0.045, type: "triangle", gain: 0.11, filterFreq: 2600 });
      if (isFinal) {
        setTimeout(() => tone({ freq: 110, freq2: 62, duration: 0.24, type: "sine", gain: 0.16, filterFreq: 700 }), 55);
      }
    } else if (type === "stone") {
      tone({ freq: 520, freq2: 280, duration: isFinal ? 0.16 : 0.10, type: "triangle", gain: isFinal ? 0.16 : 0.12, filterFreq: 2600, noise: 0.08 });
      tone({ freq: 118, freq2: 72, duration: isFinal ? 0.18 : 0.11, type: "sine", gain: isFinal ? 0.14 : 0.09, filterFreq: 700 });
    } else {
      tone({ freq: 620, freq2: 740, duration: isFinal ? 0.14 : 0.10, type: "sine", gain: isFinal ? 0.13 : 0.09, filterFreq: 3200, noise: 0.02 });
      tone({ freq: 880, duration: 0.05, type: "triangle", gain: 0.05, filterFreq: 4800 });
    }
    if (isFinal) {
      setTimeout(() => tone({ freq: 88, freq2: 48, duration: 0.22, type: "sine", gain: 0.10, filterFreq: 900 }), 60);
    }
  }

  function playPickup(resourceId) {
    const map = { wood: 540, stone: 480, fiber: 680 };
    const f = map[resourceId] ?? 560;
    tone({ freq: f, freq2: f * 1.28, duration: 0.12, type: "sine", gain: 0.12, filterFreq: 2600 });
    setTimeout(() => tone({ freq: f * 1.45, duration: 0.07, type: "sine", gain: 0.07, filterFreq: 3000 }), 68);
  }

  function playDeplete() {
    tone({ freq: 140, freq2: 52, duration: 0.26, type: "triangle", gain: 0.15, filterFreq: 1100, noise: 0.03 });
  }

  // Phase 3 combat sounds (procedural, offline)
  function playHit() {
    // Player taking damage: dull thud + low whoomp
    tone({ freq: 180, freq2: 85, duration: 0.16, type: "triangle", gain: 0.22, filterFreq: 1200, noise: 0.05 });
    tone({ freq: 90, freq2: 48, duration: 0.22, type: "sine", gain: 0.18, filterFreq: 600 });
    setTimeout(() => tone({ freq: 420, freq2: 280, duration: 0.08, type: "square", gain: 0.07, filterFreq: 2200 }), 12);
  }
  function playHurt() { playHit(); }
  function playEnemyHit() {
    tone({ freq: 480, freq2: 260, duration: 0.11, type: "triangle", gain: 0.18, filterFreq: 2200, noise: 0.04 });
    tone({ freq: 720, freq2: 420, duration: 0.06, type: "square", gain: 0.08, filterFreq: 3000 });
  }
  function playEnemyDeath() {
    tone({ freq: 260, freq2: 55, duration: 0.32, type: "triangle", gain: 0.20, filterFreq: 1100, noise: 0.06 });
    tone({ freq: 520, freq2: 180, duration: 0.18, type: "sine", gain: 0.12, filterFreq: 1800 });
    setTimeout(() => tone({ freq: 880, freq2: 420, duration: 0.12, type: "triangle", gain: 0.07, filterFreq: 2600 }), 40);
  }
  function playProjectileFire() {
    whooshNoise({ duration: 0.14, gain: 0.18, bandFreq: 920 });
    tone({ freq: 620, freq2: 420, duration: 0.10, type: "sine", gain: 0.09, filterFreq: 2400 });
  }
  function playProjectileHit() {
    tone({ freq: 320, freq2: 140, duration: 0.12, type: "triangle", gain: 0.14, filterFreq: 1600, noise: 0.04 });
  }
  function playXpCollect() {
    const f = 720;
    tone({ freq: f, freq2: f * 1.32, duration: 0.10, type: "sine", gain: 0.13, filterFreq: 2800 });
    setTimeout(() => tone({ freq: f * 1.45, duration: 0.07, type: "sine", gain: 0.08, filterFreq: 3200 }), 55);
  }
  function playCombatWhoosh() { playWhoosh(); }
  function playActivation(kind) {
    if (kind === "beacon") {
      tone({ freq: 520, freq2: 780, duration: 0.22, type: "sine", gain: 0.18, filterFreq: 2200 });
      setTimeout(()=> tone({ freq: 780, freq2: 1040, duration: 0.16, type: "sine", gain: 0.14, filterFreq: 2600 }), 90);
      whooshNoise({ duration: 0.18, gain: 0.16, bandFreq: 900 });
    } else {
      tone({ freq: 440, freq2: 660, duration: 0.24, type: "sine", gain: 0.19, filterFreq: 2000 });
      setTimeout(()=> tone({ freq: 660, freq2: 880, duration: 0.18, type: "sine", gain: 0.15, filterFreq: 2400 }), 90);
      whooshNoise({ duration: 0.16, gain: 0.15, bandFreq: 820 });
    }
  }

  return { ensure, unlock, playHarvest, playPickup, playDeplete, playWhoosh, playHit, playHurt, playEnemyHit, playEnemyDeath, playProjectileFire, playProjectileHit, playXpCollect, playCombatWhoosh, playActivation, get context() { return ctx; } };
}
