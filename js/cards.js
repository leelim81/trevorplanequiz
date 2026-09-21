// 40 trading cards: 10 planes × 4 parts. Card ids look like "p3-2" (plane index 3, part 2).
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

export function ownedParts(planeIdx, owned) {
  const set = new Set(owned);
  return [1, 2, 3, 4].filter((part) => set.has(cardId(planeIdx, part)));
}

// Never a duplicate. Leans hard toward the smallest plane that is already started so sets finish in order.
export function pickDrop(owned) {
  const set = new Set(owned);
  const unowned = allCards().filter((c) => !set.has(c.id));
  if (!unowned.length) return null;
  const started = new Set();
  for (const p of PLANES) { const n = ownedParts(p.idx, owned).length; if (n > 0 && n < 4) started.add(p.idx); }
  const target = started.size ? Math.min(...started) : -1;
  return weightedPick(unowned, (c) => (c.planeIdx === target ? 20 : started.has(c.planeIdx) ? 4 : 1));
}

export const isPlaneComplete = (planeIdx, owned) => ownedParts(planeIdx, owned).length === 4;
