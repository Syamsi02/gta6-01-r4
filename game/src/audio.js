// Synthesized sound only — WebAudio oscillators and noise, no audio files.
// Everything is guarded: no AudioContext exists until the first user gesture.
export function createAudio() {
  let ctx = null, master = null, sirenNodes = null, engineNodes = null;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || ctx.state === 'suspended') return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, low) {
    if (!ensure() || ctx.state === 'suspended') return;
    const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    shot() { noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.18, 60); },
    punch() { noise(0.07, 0.3, 700); },
    crash() { noise(0.25, 0.5, 500); tone(90, 0.2, 'sawtooth', 0.2, 40); },
    pickup() { tone(660, 0.09, 'sine', 0.25); tone(990, 0.12, 'sine', 0.25); },
    cash() { tone(880, 0.08, 'triangle', 0.25); setTimeout(() => tone(1320, 0.14, 'triangle', 0.25), 90); },
    busted() { tone(220, 0.5, 'sawtooth', 0.25, 110); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.25), i * 110)); },
    setSiren(on) {
      if (!ensure()) return;
      if (on && !sirenNodes) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 800; g.gain.value = 0.05;
        lfo.type = 'sine'; lfo.frequency.value = 0.7; lg.gain.value = 350;
        lfo.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(master);
        o.start(); lfo.start(); sirenNodes = { o, g, lfo };
      } else if (!on && sirenNodes) {
        try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch {}
        sirenNodes = null;
      }
    },
    setEngine(speed01) {
      if (!ensure()) return;
      if (speed01 <= 0.02) {
        if (engineNodes) { try { engineNodes.o.stop(); } catch {} engineNodes = null; }
        return;
      }
      if (!engineNodes) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0.03;
        o.connect(g); g.connect(master); o.start(); engineNodes = { o, g };
      }
      engineNodes.o.frequency.value = 55 + speed01 * 130;
      engineNodes.g.gain.value = 0.02 + speed01 * 0.04;
    },
  };
}
