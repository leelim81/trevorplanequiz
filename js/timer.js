import { GAME } from './config.js';

// Countdown bar: a grey overlay grows left→right over a track whose first BONUS_MS is gold.
// onTick fires at 1000/750/500/250 ms remaining; onUrgent once when the last second starts.
export function createTimer({ fill, bonus, track }) {
  let raf = 0, t0 = 0, running = false, onTimeout = null, onTick = null, onUrgent = null, nextTick = 0;
  const TICKS = [1000, 750, 500, 250];
  bonus.style.width = `${(GAME.BONUS_MS / GAME.TIMER_MS) * 100}%`;
  function frame(now) {
    const elapsed = now - t0, remaining = GAME.TIMER_MS - elapsed;
    fill.style.transform = `scaleX(${Math.min(elapsed / GAME.TIMER_MS, 1)})`;
    while (nextTick < TICKS.length && remaining <= TICKS[nextTick]) { if (nextTick === 0) { track?.classList.add('urgent'); onUrgent?.(); } onTick?.(TICKS[nextTick]); nextTick++; }
    if (elapsed >= GAME.TIMER_MS) { running = false; track?.classList.remove('urgent'); onTimeout?.(); }
    else raf = requestAnimationFrame(frame);
  }
  return {
    start(cb, tick, urgent) { onTimeout = cb; onTick = tick; onUrgent = urgent; nextTick = 0; cancelAnimationFrame(raf); t0 = performance.now(); running = true; fill.style.transform = 'scaleX(0)'; track?.classList.remove('urgent'); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); running = false; track?.classList.remove('urgent'); return performance.now() - t0; },
    reset() { cancelAnimationFrame(raf); running = false; track?.classList.remove('urgent'); fill.style.transform = 'scaleX(0)'; },
    get running() { return running; },
  };
}
