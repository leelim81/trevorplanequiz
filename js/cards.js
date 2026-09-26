// 40 trading cards: 10 planes × 4 parts. Card ids look like "p3-2" (plane index 3, part 2).
// profile.ownedCards lists every card won at least once; profile.cardCounts holds copies per card.
// A plane's number of complete sets is the smallest copy count among its four parts.
import { PLANES, PARTS } from './planes.js';
import { weightedPick } from './ui.js';

export const cardId = (planeIdx, part) => `p${planeIdx}-${part}`;
export function parseCardId(id) {
  const m = /^p(\d+)-(\d)$/.exec(id);
  return m ? { planeIdx: +m[1], part: +m[2] } : null;
}
export const partName = (part) => PARTS[part - 1];
export const partNumber = (plane, part) => `${plane.code}-0${part}`;

export function allCards() {
  const out = [];
  for (const p of PLANES) for (let part = 1; part <= 4; part++) out.push({ id: cardId(p.idx, part), planeIdx: p.idx, part });
  return out;
}

export const cardCount = (profile, id) => profile?.cardCounts?.[id] || 0;
export const planeCount = (profile, planeIdx) => Math.min(...[1, 2, 3, 4].map((part) => cardCount(profile, cardId(planeIdx, part))));
export const allOwned = (profile) => (profile?.ownedCards || []).length >= PLANES.length * 4;

// Older profiles only had ownedCards; give every owned card one copy.
export function ensureCardCounts(profile) {
  if (!profile.cardCounts) profile.cardCounts = {};
  for (const id of profile.ownedCards || []) if (!profile.cardCounts[id]) profile.cardCounts[id] = 1;
  return profile;
}

export function ownedParts(planeIdx, owned) {
  const set = new Set(owned);
  return [1, 2, 3, 4].filter((part) => set.has(cardId(planeIdx, part)));
}

// Never a duplicate while there is something new to win; leans hard toward the smallest plane
// that is already started so sets finish in order. Once everything is owned (bonus round), extra
// copies drop, steered toward whichever plane has the fewest complete sets.
export function pickDrop(profile, allowed = null) {
  const owned = profile.ownedCards || [];
  const set = new Set(owned);
  const only = (list) => (allowed && list.some((c) => allowed.has(c.planeIdx)) ? list.filter((c) => allowed.has(c.planeIdx)) : list);
  const unowned = only(allCards().filter((c) => !set.has(c.id)));
  if (unowned.length) {
    const started = new Set();
    for (const p of PLANES) { const n = ownedParts(p.idx, owned).length; if (n > 0 && n < 4) started.add(p.idx); }
    const target = started.size ? Math.min(...started) : -1;
    return weightedPick(unowned, (c) => (c.planeIdx === target ? 20 : started.has(c.planeIdx) ? 4 : 1));
  }
  const pool = only(allCards());
  const counts = new Map(pool.map((c) => [c.planeIdx, planeCount(profile, c.planeIdx)]));
  const minCount = Math.min(...counts.values());
  const target = [...counts.entries()].find(([, n]) => n === minCount)[0];
  return weightedPick(pool, (c) => (c.planeIdx === target ? (cardCount(profile, c.id) <= minCount ? 20 : 4) : 1));
}

// Records a won card; returns true when it completed a (new or extra) full set of that plane.
export function addCard(profile, id) {
  ensureCardCounts(profile);
  const { planeIdx } = parseCardId(id);
  const before = planeCount(profile, planeIdx);
  if (!profile.ownedCards.includes(id)) profile.ownedCards.push(id);
  profile.cardCounts[id] = (profile.cardCounts[id] || 0) + 1;
  const after = planeCount(profile, planeIdx);
  if (after > before && !profile.completedPlanes.includes(planeIdx)) profile.completedPlanes.push(planeIdx);
  return { completes: after > before, setNumber: after, copies: profile.cardCounts[id] };
}

// The planes worth showing in the claw machine: whatever the next drops are most likely to be,
// topped up with random ones so the cabinet is always full.
export function likelyPlanes(profile, n) {
  const seen = new Map();
  for (let i = 0; i < n * 8 && seen.size < n; i++) {
    const c = pickDrop(profile);
    if (c && !seen.has(c.planeIdx)) seen.set(c.planeIdx, PLANES[c.planeIdx]);
  }
  const rest = PLANES.filter((p) => !seen.has(p.idx)).sort(() => Math.random() - 0.5);
  return [...seen.values(), ...rest].slice(0, n).sort((a, b) => a.size - b.size);
}

// Adds `n` more complete sets of every plane (used for the VIP daily top-up).
export function grantSets(profile, n) {
  ensureCardCounts(profile);
  for (const plane of PLANES) {
    for (let part = 1; part <= 4; part++) {
      const id = cardId(plane.idx, part);
      if (!profile.ownedCards.includes(id)) profile.ownedCards.push(id);
      profile.cardCounts[id] = (profile.cardCounts[id] || 0) + n;
    }
    if (!profile.completedPlanes.includes(plane.idx)) profile.completedPlanes.push(plane.idx);
  }
}

// Gives a profile every card, with `sets` complete sets of each plane (sets may be a function of the plane).
export function grantEverything(profile, sets) {
  ensureCardCounts(profile);
  for (const plane of PLANES) {
    const n = typeof sets === 'function' ? sets(plane) : sets;
    for (let part = 1; part <= 4; part++) {
      const id = cardId(plane.idx, part);
      if (!profile.ownedCards.includes(id)) profile.ownedCards.push(id);
      profile.cardCounts[id] = Math.max(profile.cardCounts[id] || 0, n);
    }
    if (!profile.completedPlanes.includes(plane.idx)) profile.completedPlanes.push(plane.idx);
  }
}
