import { registerScreen, showScreen, $, el, fmt } from './ui.js';
import { state, fetchLeaderboard } from './store.js';
import { PLANES } from './planes.js';

const MEDALS = ['🥇', '🥈', '🥉'];

registerScreen('leaderboard', {
  enter: async () => {
    const list = $('#leaderboard-list');
    list.replaceChildren(el('li', { class: 'sub', text: 'Loading…' }));
    let rows = [];
    try { rows = await fetchLeaderboard(); } catch (e) { console.error(e); list.replaceChildren(el('li', { class: 'msg', text: 'Could not load the leaderboard' })); return; }
    list.replaceChildren(...rows.map((r, i) => el('li', {}, el('button', {
      class: `lb-row ${r.uid === state.uid ? 'me' : ''}`,
      onclick: () => showScreen('profile', { uid: r.uid, from: 'leaderboard' }),
    }, [
      el('span', { class: 'lb-rank', text: MEDALS[i] || `${i + 1}` }),
      el('span', { class: 'lb-name' }, [r.username || '?', el('div', { class: 'lb-sub', text: `${fmt(r.totalPoints || 0)} pts · ${(r.completedPlanes || []).length}/${PLANES.length} planes · ${(r.badges || []).length} badges` })]),
      el('span', { class: 'lb-score', text: fmt(r.bestRun || 0) }),
    ]))));
    if (!rows.length) list.replaceChildren(el('li', { class: 'sub', text: 'No pilots yet — play a round!' }));
  },
});
