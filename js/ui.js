import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.module.mjs';

const screens = new Map();
let current = null;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) node.append(c);
  return node;
}

export function registerScreen(name, handlers) { screens.set(name, handlers); }

export async function showScreen(name, params = {}) {
  if (current && screens.get(current)?.leave) {
    try { await screens.get(current).leave(); } catch (e) { console.error(e); }
  }
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
  current = name;
  $('#hud').hidden = ['loading', 'signin', 'username'].includes(name);
  $('#hud-lives-wrap').hidden = name !== 'quiz';
  if (screens.get(name)?.enter) {
    try { await screens.get(name).enter(params); } catch (e) { console.error(e); toast('Oops, something went wrong'); }
  }
}
export function currentScreen() { return current; }

export function toast(msg, { cls = '', ms = 2200 } = {}) {
  const t = el('div', { class: `toast ${cls}`, text: msg });
  $('#toasts').append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, ms);
}

export function updateHud({ username, points, coins, lives }) {
  if (username !== undefined) $('#hud-name').textContent = username;
  if (points !== undefined) $('#hud-points').textContent = points;
  if (coins !== undefined) { $('#hud-coins').textContent = coins; $('#menu-coins').textContent = `🪙 ${coins}`; }
  if (lives !== undefined) $('#hud-lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
}

export function confettiBurst(kind = 'bonus') {
  const presets = {
    bonus: [{ particleCount: 90, spread: 70, origin: { y: 0.6 }, startVelocity: 40 }],
    big: [
      { particleCount: 160, spread: 100, origin: { y: 0.6 }, startVelocity: 55 },
      { particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } },
      { particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } },
    ],
  };
  for (const p of presets[kind] || presets.bonus) confetti({ zIndex: 60, ...p });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function weightedPick(items, weightOf) {
  let total = 0; const w = items.map((it) => { const x = Math.max(0, weightOf(it)); total += x; return x; });
  if (total <= 0) return pick(items);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
