import { registerScreen, showScreen, $, el, fmt } from './ui.js';
import { PLANES } from './planes.js';
import { state, fetchPublicProfile } from './store.js';
import { BADGES } from './badges.js';
import { renderCollectionGrid } from './collection.js';

let backTo = 'menu';
$('#btn-profile-back').addEventListener('click', () => showScreen(backTo));

registerScreen('profile', {
  enter: async ({ uid = null, from = 'menu' } = {}) => {
    backTo = from;
    const mine = !uid || uid === state.uid;
    const p = mine ? { uid: state.uid, ...state.profile } : await fetchPublicProfile(uid);
    if (!p) { $('#profile-title').textContent = 'Pilot not found'; return; }
    $('#profile-title').textContent = mine ? '🎖️ My badges' : `${p.username}'s hangar`;
    const stats = [
      ['Best run', fmt(p.bestRun || 0)], ['Total points', fmt(p.totalPoints || 0)],
      ['Correct', fmt(p.correctTotal || 0)], ['Planes built', `${(p.completedPlanes || []).length}/${PLANES.length}`],
    ];
    $('#profile-stats').replaceChildren(...stats.map(([k, v]) => el('div', { class: 'stat-box' }, [el('b', { text: v }), el('span', { text: k })])));
    const owned = new Set(p.badges || []);
    $('#profile-badges').replaceChildren(...BADGES.map((b) => el('div', { class: `badge ${owned.has(b.id) ? '' : 'locked'}`, title: b.desc }, [
      el('div', { class: 'badge-icon', text: b.icon }), el('div', { class: 'badge-name', text: b.name }), el('div', { class: 'badge-desc', text: b.desc }),
    ])));
    await renderCollectionGrid($('#profile-collection'), p, { readOnly: true, from: 'profile' });
  },
});
