import { state, markDirty, save } from './store.js';
import { showBadgeModal } from './ui.js';

export const BADGES = [
  { id: 'takeoff', name: 'Takeoff', icon: '🛫', desc: 'Get your first answer right', test: (c) => c.correctTotal >= 1 },
  { id: 'lightning', name: 'Lightning Fingers', icon: '⚡', desc: '3 correct in a row inside the gold zone', test: (c) => c.fastStreak >= 3 },
  { id: 'onfire', name: 'On Fire', icon: '🔥', desc: '10 correct answers in a row', test: (c) => c.runStreak >= 10 },
  { id: 'highflyer', name: 'High Flyer', icon: '🎈', desc: 'Score 25 in one run', test: (c) => c.runScore >= 25 },
  { id: 'ace', name: 'Ace', icon: '🏅', desc: 'Score 50 in one run', test: (c) => c.runScore >= 50 },
  { id: 'century', name: 'Century', icon: '💯', desc: 'Earn 100 points in total', test: (c) => c.totalPoints >= 100 },
  { id: 'globetrotter', name: 'Globetrotter', icon: '🌍', desc: 'Know 50 different flags', test: (c) => c.distinct.flags >= 50 },
  { id: 'spotter', name: 'Plane Spotter', icon: '🔭', desc: 'Know 30 different airlines', test: (c) => c.distinct.airlines >= 30 },
  { id: 'gearhead', name: 'Gearhead', icon: '🔧', desc: 'Know 30 different car brands', test: (c) => c.distinct.cars >= 30 },
  { id: 'collector', name: 'Collector', icon: '🃏', desc: 'Win your first trading card', test: (c) => c.ownedCards >= 1 },
  { id: 'mechanic', name: 'Mechanic', icon: '🛠️', desc: 'Complete your first plane', test: (c) => c.completedPlanes >= 1 },
  { id: 'hangar', name: 'Full Hangar', icon: '🏆', desc: 'Complete all 10 planes', test: (c) => c.completedPlanes >= 10 },
  { id: 'luckyclaw', name: 'Lucky Claw', icon: '🍀', desc: 'Win the claw 3 times in a row', test: (c) => c.clawStreak >= 3 },
];
export const badgeById = (id) => BADGES.find((b) => b.id === id);

const PREFIX_TO_CAT = { air: 'airlines', car: 'cars', flag: 'flags' };

function buildCtx(run) {
  const p = state.profile;
  const distinct = { airlines: 0, cars: 0, flags: 0 };
  for (const [id, [c]] of Object.entries(state.stats?.q || {})) {
    if (c > 0) distinct[PREFIX_TO_CAT[id.split(':')[0]]]++;
  }
  return {
    correctTotal: p.correctTotal || 0, totalPoints: p.totalPoints || 0,
    ownedCards: (p.ownedCards || []).length, completedPlanes: (p.completedPlanes || []).length,
    clawStreak: p.clawStreak || 0, distinct,
    fastStreak: 0, runStreak: 0, runScore: 0, ...run,
  };
}

// Checks every badge against the current state; unlocks and saves new ones and shows the
// unlock pop-up for each. Resolves once the player has dismissed them all.
export async function evaluateBadges(run = {}) {
  const p = state.profile;
  if (!p) return [];
  const ctx = buildCtx(run);
  const unlocked = BADGES.filter((b) => !p.badges.includes(b.id) && b.test(ctx));
  if (unlocked.length) {
    for (const b of unlocked) p.badges.push(b.id);
    markDirty(); save(true);
    for (const b of unlocked) await showBadgeModal(b);
  }
  return unlocked;
}
