// In-memory game state + persistence (Firestore, or localStorage in guest mode).
import { GAME } from './config.js';
import * as fb from './firebase.js';
import { updateHud } from './ui.js';

export const state = { user: null, uid: null, profile: null, stats: null, guest: false };
const GUEST_KEY = 'tpq-guest-v1';
let dirty = false;

export function newProfile(username) {
  return {
    username, usernameLower: username.toLowerCase(), createdAt: Date.now(),
    bestRun: 0, totalPoints: 0, coinsSpent: 0,
    badges: [], ownedCards: [], completedPlanes: [],
    clawWins: 0, clawTries: 0, correctTotal: 0, wrongTotal: 0, runs: 0,
  };
}
export const newStats = () => ({ q: {} });

export function coins(p = state.profile) {
  return p ? Math.max(0, Math.floor((p.totalPoints || 0) / GAME.POINTS_PER_COIN) - (p.coinsSpent || 0)) : 0;
}

export function refreshHud() {
  const p = state.profile;
  if (p) updateHud({ username: p.username, points: p.totalPoints, coins: coins(p) });
}

export function validateUsername(name) {
  const n = name.trim();
  if (n.length < 3) return 'Name must be at least 3 letters';
  if (n.length > 16) return 'Name must be 16 letters or fewer';
  if (!/^[A-Za-z0-9_ ]+$/.test(n)) return 'Only letters, numbers, spaces and _';
  return null;
}

// ---------- Firestore ----------
const userRef = (uid) => fb.fs.doc(fb.db, 'users', uid);
const statsRef = (uid) => fb.fs.doc(fb.db, 'users', uid, 'private', 'stats');
const nameRef = (lower) => fb.fs.doc(fb.db, 'usernames', lower);

export async function loadProfile(user) {
  state.user = user; state.uid = user.uid; state.guest = false;
  const [pSnap, sSnap] = await Promise.all([fb.fs.getDoc(userRef(user.uid)), fb.fs.getDoc(statsRef(user.uid))]);
  if (!pSnap.exists()) { state.profile = null; state.stats = null; return null; }
  state.profile = { ...newProfile(''), ...pSnap.data() };
  state.stats = sSnap.exists() ? { ...newStats(), ...sSnap.data() } : newStats();
  refreshHud();
  return state.profile;
}

export async function createProfile(username) {
  const name = username.trim();
  const profile = newProfile(name);
  if (state.guest) {
    state.profile = profile; state.stats = newStats(); saveGuest(); refreshHud(); return profile;
  }
  await fb.fs.runTransaction(fb.db, async (tx) => {
    const taken = await tx.get(nameRef(profile.usernameLower));
    if (taken.exists() && taken.data().uid !== state.uid) throw new Error('taken');
    tx.set(nameRef(profile.usernameLower), { uid: state.uid });
    tx.set(userRef(state.uid), { ...profile, createdAt: fb.fs.serverTimestamp() });
    tx.set(statsRef(state.uid), newStats());
  });
  state.profile = profile; state.stats = newStats(); refreshHud();
  return profile;
}

export function markDirty() { dirty = true; }

// Writes the public profile + private stats. Called every few questions, at run end and on events.
export async function save(force = false) {
  if (!state.profile || (!dirty && !force)) return;
  dirty = false;
  if (state.guest) { saveGuest(); return; }
  const p = state.profile;
  const pub = {
    username: p.username, usernameLower: p.usernameLower,
    bestRun: p.bestRun, totalPoints: p.totalPoints, coinsSpent: p.coinsSpent,
    badges: p.badges, ownedCards: p.ownedCards, completedPlanes: p.completedPlanes,
    clawWins: p.clawWins, clawTries: p.clawTries, correctTotal: p.correctTotal, wrongTotal: p.wrongTotal, runs: p.runs,
    updatedAt: fb.fs.serverTimestamp(),
  };
  try {
    await Promise.all([
      fb.fs.setDoc(userRef(state.uid), pub, { merge: true }),
      fb.fs.setDoc(statsRef(state.uid), state.stats),
    ]);
  } catch (e) {
    console.error('save failed', e); dirty = true;
  }
}

export async function fetchLeaderboard() {
  if (state.guest) return [{ uid: 'guest', ...state.profile }];
  const q = fb.fs.query(fb.fs.collection(fb.db, 'users'), fb.fs.orderBy('bestRun', 'desc'), fb.fs.limit(GAME.LEADERBOARD_SIZE));
  const snap = await fb.fs.getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function fetchPublicProfile(uid) {
  if (state.guest || uid === state.uid) return { uid: state.uid || 'guest', ...state.profile };
  const snap = await fb.fs.getDoc(userRef(uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// ---------- Guest mode (no Firebase config yet) ----------
export function startGuest() {
  state.guest = true; state.uid = 'guest';
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) { const d = JSON.parse(raw); state.profile = { ...newProfile(''), ...d.profile }; state.stats = { ...newStats(), ...d.stats }; }
  } catch { /* ignore */ }
  refreshHud();
  return state.profile;
}
function saveGuest() {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify({ profile: state.profile, stats: state.stats })); } catch { /* ignore */ }
}
export function clearGuest() { try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ } }

// Flush when the tab is hidden/closed so progress is not lost.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
window.addEventListener('pagehide', () => save());
