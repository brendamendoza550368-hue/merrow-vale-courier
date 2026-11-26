// Synthesised sound: no audio files ship with the game. A WebAudio engine hum
// follows the throttle, with a chime for each ring and a thud for touchdown.

let ctx = null;
let engineOsc = null;
let engineGain = null;
let started = false;

export function ensureAudio() {
  if (started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    started = true;
  } catch (e) {
    started = false; // audio is decoration; the game plays on without it
  }
}

export function setEngine(throttle, speed, airborne) {
  if (!started || !ctx) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.25, t, 0.1);
  engineGain.gain.setTargetAtTime(airborne ? 0.02 + throttle * 0.05 : throttle * 0.02, t, 0.15);
}

function blip(freq, dur, vol, type) {
  if (!started || !ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}

export function ringChime() {
  blip(880, 0.35, 0.12);
  setTimeout(() => blip(1318, 0.4, 0.1), 90);
}

export function thud() {
  blip(70, 0.3, 0.25, 'triangle');
}

export function crashSound() {
  blip(160, 0.5, 0.2, 'square');
  setTimeout(() => blip(90, 0.7, 0.2, 'square'), 120);
}
