import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.module.mjs';
import * as audio from './audio.js';

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
  if (current && current !== 'loading') audio.play('whoosh');
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

// Re-triggers a CSS animation class on an element.
export function bump(node, cls = 'bump') {
  if (!node) return;
  node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
}

export function updateHud({ username, points, coins, lives }) {
  if (username !== undefined) $('#hud-name').textContent = username;
  if (points !== undefined) { const n = $('#hud-points'); if (n.textContent !== String(points)) { n.textContent = points; bump($('#hud-points-wrap')); } }
  if (coins !== undefined) { const n = $('#hud-coins'); if (n.textContent !== String(coins)) { n.textContent = coins; bump($('#hud-coins-wrap')); } $('#menu-coins').textContent = `🪙 ${coins}`; }
  if (lives !== undefined) $('#hud-lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
}

// Floating "+2 ⚡" style text at a screen position (defaults to the centre of `anchor`).
export function floatText(text, { anchor = null, cls = '', x, y } = {}) {
  const layer = $('#fx-layer');
  if (anchor) { const r = anchor.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  const node = el('div', { class: `float-text ${cls}`, text, style: `left:${x ?? innerWidth / 2}px;top:${y ?? innerHeight / 2}px` });
  layer.append(node);
  setTimeout(() => node.remove(), 1100);
}

// A coin flies from `from` (element or point) to the HUD coin counter.
export function flyCoin(from) {
  const target = $('#hud-coins-wrap');
  if (!target) return;
  const layer = $('#fx-layer');
  const r = from?.getBoundingClientRect ? from.getBoundingClientRect() : null;
  const x0 = r ? r.left + r.width / 2 : innerWidth / 2, y0 = r ? r.top + r.height / 2 : innerHeight / 2;
  const t = target.getBoundingClientRect(); const x1 = t.left + t.width / 2, y1 = t.top + t.height / 2;
  const coin = el('div', { class: 'fly-coin', text: '🪙', style: `left:${x0}px;top:${y0}px` });
  layer.append(coin);
  const anim = coin.animate([
    { transform: 'translate(-50%,-50%) scale(.6)', offset: 0 },
    { transform: `translate(calc(-50% + ${(x1 - x0) * 0.3}px), calc(-50% + ${(y1 - y0) * 0.3 - 80}px)) scale(1.4)`, offset: 0.35 },
    { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.5)`, offset: 1 },
  ], { duration: 800, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
  anim.onfinish = () => { coin.remove(); bump(target); audio.play('coin'); };
}

export function countUp(node, to, ms = 900) {
  const t0 = performance.now();
  (function step(now) {
    const t = Math.min(1, (now - t0) / ms); const v = Math.round(to * (1 - Math.pow(1 - t, 3)));
    node.textContent = v; if (t < 1) requestAnimationFrame(step);
  })(t0);
}

let badgeQueue = Promise.resolve();
export function showBadgeModal(badge) {
  badgeQueue = badgeQueue.then(() => new Promise((resolve) => {
    const modal = $('#badge-modal');
    $('#badge-modal-icon').textContent = badge.icon;
    $('#badge-modal-name').textContent = badge.name;
    $('#badge-modal-desc').textContent = badge.desc;
    modal.hidden = false;
    audio.play('badge'); confettiBurst('big');
    const ok = $('#badge-modal-ok');
    const done = () => { ok.removeEventListener('click', done); modal.hidden = true; resolve(); };
    ok.addEventListener('click', done);
  }));
  return badgeQueue;
}

export function confettiBurst(kind = 'bonus') {
  const presets = {
    bonus: [{ particleCount: 90, spread: 70, origin: { y: 0.6 }, startVelocity: 40, colors: ['#fcd34d', '#f472b6', '#4ade80', '#4cc3ff', '#fff'] }],
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
