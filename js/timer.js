import { GAME } from './config.js';

// Countdown bar: a grey overlay grows left→right over a track whose first BONUS_MS is gold.
export function createTimer({ fill, bonus }) {
  let raf = 0, t0 = 0, running = false, onTimeout = null;
  bonus.style.width = `${(GAME.BONUS_MS / GAME.TIMER_MS) * 100}%`;
  function frame(now) {
    const elapsed = now - t0;
    fill.style.transform = `scaleX(${Math.min(elapsed / GAME.TIMER_MS, 1)})`;
    if (elapsed >= GAME.TIMER_MS) { running = false; onTimeout?.(); }
    else raf = requestAnimationFrame(frame);
  }
  return {
    start(cb) { onTimeout = cb; cancelAnimationFrame(raf); t0 = performance.now(); running = true; fill.style.transform = 'scaleX(0)'; raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); running = false; return performance.now() - t0; },
    reset() { cancelAnimationFrame(raf); running = false; fill.style.transform = 'scaleX(0)'; },
    get running() { return running; },
  };
}
