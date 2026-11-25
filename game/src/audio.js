// Warung Rasa — every sound is synthesized with WebAudio. No audio files.

let ctx = null;
let master = null;
let sizzleNodes = null;
let muted = false;

function ensureContext() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, filterFreq, when = 0) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export function playChop() {
  noiseBurst(0.09, 0.5, 900);
  tone(140, 0.08, 'triangle', 0.25, 0, 70);
}

export function playPop() {
  tone(520, 0.07, 'sine', 0.22, 0, 780);
}

export function playPlace() {
  tone(300, 0.08, 'triangle', 0.2, 0, 210);
  noiseBurst(0.05, 0.18, 1400);
}

export function playDing() {
  tone(880, 0.18, 'sine', 0.3);
  tone(1318, 0.28, 'sine', 0.22, 0.1);
}

export function playCoin() {
  tone(988, 0.09, 'square', 0.12);
  tone(1319, 0.09, 'square', 0.12, 0.08);
  tone(1568, 0.16, 'square', 0.12, 0.16);
}

export function playError() {
  tone(160, 0.16, 'sawtooth', 0.16, 0, 110);
}

export function playBurnAlarm() {
  tone(220, 0.12, 'square', 0.14);
  tone(220, 0.12, 'square', 0.14, 0.16);
}

export function playOrderArrive() {
  tone(660, 0.1, 'triangle', 0.2);
  tone(880, 0.14, 'triangle', 0.2, 0.09);
}

export function playClick() {
  tone(700, 0.05, 'sine', 0.15);
}

// A soft looping sizzle whose level follows how many pans are cooking.
export function setSizzleLevel(level) {
  const c = ensureContext();
  if (!c) return;
  if (level <= 0) {
    if (sizzleNodes) {
      try { sizzleNodes.src.stop(); } catch (e) { /* already stopped */ }
      sizzleNodes = null;
    }
    return;
  }
  if (!sizzleNodes) {
    const len = c.sampleRate;
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    sizzleNodes = { src, gain };
  }
  sizzleNodes.gain.gain.setTargetAtTime(muted ? 0 : 0.05 * level, c.currentTime, 0.15);
}
