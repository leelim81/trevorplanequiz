import * as fb from './firebase.js';
import { showScreen, registerScreen, $, $$, toast, el } from './ui.js';
import { loadQuestionBank } from './data.js';
import * as store from './store.js';
import { watchAuth, signInWithGoogle, signOutUser } from './auth.js';
import { getLastCategory } from './quiz.js';
import './claw.js';
import './reward.js';
import './assembly.js';
import './collection.js';
import './leaderboard.js';
import './profile.js';
import './credits.js';

registerScreen('menu', { enter: () => store.refreshHud() });

function wire() {
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => showScreen(b.dataset.go)));
  $('#hud-home').addEventListener('click', () => showScreen('menu'));
  $$('.btn-cat').forEach((b) => b.addEventListener('click', () => showScreen('quiz', { category: b.dataset.cat })));
  $('#btn-again').addEventListener('click', () => showScreen('quiz', { category: getLastCategory() }));

  $('#btn-google').addEventListener('click', () => {
    $('#signin-msg').textContent = '';
    signInWithGoogle().catch((e) => {
      console.error(e);
      const m = { 'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and tap again.', 'auth/popup-closed-by-user': 'Sign-in window closed. Tap to try again.', 'auth/unauthorized-domain': 'This website is not yet allowed in Firebase (Authentication → Settings → Authorized domains).' };
      $('#signin-msg').textContent = m[e.code] || `Sign-in failed: ${e.message}`;
    });
  });

  const submitName = async () => {
    const input = $('#username-input'), msg = $('#username-msg');
    const err = store.validateUsername(input.value);
    if (err) { msg.textContent = err; return; }
    $('#btn-username').disabled = true; msg.textContent = '';
    try { await store.createProfile(input.value); toast(`Welcome aboard, ${store.state.profile.username}! ✈️`); showScreen('menu'); }
    catch (e) { msg.textContent = e.message === 'taken' ? 'That name is taken — try another' : `Could not save: ${e.message}`; }
    finally { $('#btn-username').disabled = false; }
  };
  $('#btn-username').addEventListener('click', submitName);
  $('#username-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitName(); });

  $('#btn-signout').addEventListener('click', async () => {
    await store.save(true);
    if (store.state.guest) { store.clearGuest(); location.reload(); return; }
    await signOutUser();
    store.state.profile = null; store.state.stats = null;
  });
}

async function boot() {
  wire();
  $('#loading-msg').textContent = 'Loading questions…';
  await loadQuestionBank();

  const forceGuest = new URLSearchParams(location.search).has('guest'); // ?guest=1 for testing without sign-in
  if (!fb.enabled || forceGuest) {
    document.body.prepend(el('div', { class: 'guest-banner', text: forceGuest ? 'Guest mode (test) — progress is saved on this device only' : 'Guest mode — Firebase is not configured yet, progress is saved on this device only' }));
    store.startGuest();
    showScreen(store.state.profile ? 'menu' : 'username');
    return;
  }
  try { await fb.initFirebase(); }
  catch (e) { console.error(e); $('#loading-msg').textContent = `Firebase failed to load: ${e.message}`; return; }
  watchAuth(async (user) => {
    if (!user) { showScreen('signin'); return; }
    $('#loading-msg').textContent = 'Loading your pilot…';
    showScreen('loading');
    try {
      const profile = await store.loadProfile(user);
      showScreen(profile ? 'menu' : 'username');
    } catch (e) {
      console.error(e);
      showScreen('signin');
      $('#signin-msg').textContent = `Could not load your profile: ${e.message}`;
    }
  });
}

boot().catch((e) => { console.error(e); $('#loading-msg').textContent = `Failed to start: ${e.message}`; });
