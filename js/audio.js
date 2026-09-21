// All sound is synthesised with the Web Audio API — no audio files needed.
const KEY = 'tpq-muted';
let ctx = null, master = null, sfxBus = null, musicBus = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
  return true;
}

// Browsers only allow audio after a user gesture: call this from any pointer/key handler.
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02);
}

// ---------- synth helpers ----------
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function tone({ freq, type = 'sine', dur = 0.15, vol = 0.25, attack = 0.005, slideTo = null, delay = 0, bus = sfxBus }) {
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus); o.start(t0); o.stop(t0 + dur + 0.05);
}
let noiseBuf = null;
function noise({ dur = 0.2, vol = 0.2, from = 4000, to = 300, delay = 0, type = 'lowpass', bus = sfxBus }) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(bus); s.start(t0); s.stop(t0 + dur + 0.05);
}
const seq = (notes, step, opts) => notes.forEach((n, i) => n && tone({ freq: midi(n), delay: i * step, ...opts }));

const SFX = {
  click: () => tone({ freq: 520, slideTo: 880, type: 'sine', dur: 0.07, vol: 0.18 }),
  pop: () => { tone({ freq: 400, slideTo: 760, dur: 0.09, vol: 0.2 }); noise({ dur: 0.06, vol: 0.05, from: 3000, to: 800 }); },
  whoosh: () => noise({ dur: 0.28, vol: 0.12, from: 600, to: 4000, type: 'bandpass' }),
  correct: () => seq([76, 81], 0.09, { type: 'triangle', dur: 0.18, vol: 0.28 }),
  bonus: () => { seq([84, 88, 91, 96], 0.06, { type: 'triangle', dur: 0.16, vol: 0.22 }); noise({ dur: 0.35, vol: 0.05, from: 8000, to: 2000, type: 'highpass', delay: 0.1 }); },
  wrong: () => { tone({ freq: 220, slideTo: 110, type: 'sawtooth', dur: 0.32, vol: 0.14 }); tone({ freq: 110, slideTo: 60, type: 'square', dur: 0.32, vol: 0.06 }); },
  timeout: () => { tone({ freq: 180, type: 'square', dur: 0.12, vol: 0.1 }); tone({ freq: 150, type: 'square', dur: 0.25, vol: 0.1, delay: 0.16 }); },
  tick: () => tone({ freq: 1400, type: 'square', dur: 0.03, vol: 0.06 }),
  coin: () => seq([88, 93], 0.07, { type: 'square', dur: 0.32, vol: 0.09 }),
  life: () => { tone({ freq: 440, slideTo: 200, type: 'triangle', dur: 0.4, vol: 0.18 }); noise({ dur: 0.15, vol: 0.08, from: 2000, to: 200 }); },
  badge: () => seq([72, 76, 79, 84, 84], 0.11, { type: 'triangle', dur: 0.28, vol: 0.22 }),
  fanfare: () => { seq([72, 76, 79, 84, 79, 84], 0.12, { type: 'triangle', dur: 0.3, vol: 0.22 }); seq([48, 52, 55, 60, 55, 60], 0.12, { type: 'square', dur: 0.3, vol: 0.06 }); },
  bigwin: () => { seq([72, 76, 79, 84, 88, 91, 96], 0.1, { type: 'triangle', dur: 0.35, vol: 0.2 }); [72, 76, 79, 84].forEach((n) => tone({ freq: midi(n), type: 'sine', dur: 1.6, vol: 0.09, delay: 0.75 })); noise({ dur: 1.2, vol: 0.06, from: 6000, to: 800, type: 'highpass', delay: 0.7 }); },
  lose: () => { tone({ freq: 330, slideTo: 250, type: 'sawtooth', dur: 0.3, vol: 0.1 }); tone({ freq: 250, slideTo: 170, type: 'sawtooth', dur: 0.5, vol: 0.1, delay: 0.32 }); },
  gameover: () => seq([79, 76, 72, 67], 0.16, { type: 'triangle', dur: 0.32, vol: 0.2 }),
  motor: () => { for (let i = 0; i < 6; i++) tone({ freq: 95 + (i % 2) * 6, type: 'sawtooth', dur: 0.14, vol: 0.05, delay: i * 0.13 }); },
  grab: () => { noise({ dur: 0.08, vol: 0.18, from: 2500, to: 400 }); tone({ freq: 900, slideTo: 500, type: 'square', dur: 0.08, vol: 0.08 }); },
  drop: () => { noise({ dur: 0.25, vol: 0.14, from: 1500, to: 200 }); tone({ freq: 160, slideTo: 60, type: 'sine', dur: 0.25, vol: 0.2 }); },
  flip: () => { noise({ dur: 0.2, vol: 0.1, from: 800, to: 5000, type: 'bandpass' }); tone({ freq: 600, slideTo: 1200, type: 'sine', dur: 0.2, vol: 0.12, delay: 0.05 }); },
  chime: () => seq([84, 88, 91], 0.1, { type: 'sine', dur: 0.5, vol: 0.18 }),
  heart: () => seq([84, 91], 0.08, { type: 'sine', dur: 0.25, vol: 0.15 }),
};

export function play(name) {
  if (!ensure() || ctx.state !== 'running' || muted) return;
  try { SFX[name]?.(); } catch (e) { console.warn('sfx', name, e); }
}

// ---------- background music: a bouncy 4-bar chiptune loop ----------
const BPM = 132, STEP = 60 / BPM / 4, STEPS = 64; // 16th notes, 4 bars
const MELODY = [ // one note per 8th (0 = rest)
  72, 76, 79, 76, 81, 79, 76, 72,   74, 77, 81, 77, 79, 77, 76, 74,
  76, 79, 84, 79, 81, 84, 81, 79,   77, 81, 79, 76, 74, 76, 72, 0,
];
const BASS = [48, 55, 48, 55, 53, 60, 55, 62, 48, 55, 48, 55, 53, 55, 48, 48]; // per quarter
const PADS = [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67], [69, 72, 76], [65, 69, 72], [67, 71, 74]]; // per half bar
let musicTimer = 0, nextTime = 0, step = 0, ducked = false, wantMusic = false;

function scheduleStep(s, t) {
  const eighth = s % 2 === 0, quarter = s % 4 === 0;
  if (eighth) {
    const n = MELODY[(s / 2) % MELODY.length];
    if (n) { tone({ freq: midi(n), type: 'triangle', dur: 0.17, vol: 0.13, delay: t - ctx.currentTime, bus: musicBus }); tone({ freq: midi(n + 12), type: 'sine', dur: 0.1, vol: 0.03, delay: t - ctx.currentTime, bus: musicBus }); }
    noise({ dur: 0.04, vol: s % 4 === 2 ? 0.035 : 0.02, from: 9000, to: 6000, type: 'highpass', delay: t - ctx.currentTime, bus: musicBus });
  }
  if (quarter) tone({ freq: midi(BASS[(s / 4) % BASS.length]), type: 'square', dur: 0.22, vol: 0.05, delay: t - ctx.currentTime, bus: musicBus });
  if (s % 8 === 0) tone({ freq: 150, slideTo: 45, type: 'sine', dur: 0.18, vol: 0.28, delay: t - ctx.currentTime, bus: musicBus });
  if (s % 8 === 4) noise({ dur: 0.12, vol: 0.07, from: 1800, to: 900, type: 'bandpass', delay: t - ctx.currentTime, bus: musicBus });
  if (s % 8 === 0) for (const n of PADS[(s / 8) % PADS.length]) tone({ freq: midi(n), type: 'sine', dur: STEP * 8, vol: 0.028, attack: 0.15, delay: t - ctx.currentTime, bus: musicBus });
}
function scheduler() {
  while (nextTime < ctx.currentTime + 0.15) { scheduleStep(step, nextTime); nextTime += STEP; step = (step + 1) % STEPS; }
}
export function startMusic() {
  wantMusic = true;
  if (!ensure() || ctx.state !== 'running' || musicTimer) return;
  step = 0; nextTime = ctx.currentTime + 0.05;
  musicTimer = setInterval(scheduler, 40);
}
export function stopMusic() { wantMusic = false; clearInterval(musicTimer); musicTimer = 0; }
export function duckMusic(on) {
  ducked = on;
  if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.0 : 0.55, ctx.currentTime, 0.15);
}
export const musicWanted = () => wantMusic;

// Resume the context (and any music we wanted) on every gesture until it is running.
function onGesture() {
  unlock();
  if (ctx && ctx.state === 'running' && wantMusic && !musicTimer) startMusic();
}
document.addEventListener('pointerdown', onGesture, { capture: true });
document.addEventListener('keydown', onGesture, { capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (musicBus) musicBus.gain.value = 0; } else if (musicBus) musicBus.gain.value = ducked ? 0 : 0.55; });
