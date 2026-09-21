// After a claw win: a "rewarded video" (no skipping), then the card flips over.
import { GAME } from './config.js';
import { registerScreen, showScreen, $, pick, confettiBurst } from './ui.js';
import { parseCardId } from './cards.js';
import { createCardElement } from './cardRender.js';
import { PLANES } from './planes.js';
import * as audio from './audio.js';

const video = $('#reward-video'), wrap = $('#video-wrap'), fill = $('#video-progress-fill');
const btnWatch = $('#btn-watch'), btnDone = $('#btn-reward-done'), reveal = $('#card-reveal'), gift = $('#reward-gift');
const adTimer = $('#ad-timer'), adClose = $('#ad-close'), adCta = $('#ad-cta');
let ctx = null, lastTime = 0, fallbackTimer = 0;

registerScreen('reward', { enter, leave });

function enter({ cardId, completes = false } = {}) {
  ctx = { cardId, completes, revealed: false, ready: false };
  const { planeIdx } = parseCardId(cardId);
  $('#reward-title').textContent = `You won a ${PLANES[planeIdx].name} card! 🎁`;
  gift.hidden = false; btnWatch.hidden = false; wrap.hidden = true; reveal.hidden = true; btnDone.hidden = true;
  reveal.replaceChildren(); fill.style.width = '0';
  adTimer.textContent = 'Reward in …'; adClose.disabled = true; adClose.classList.remove('ready');
  adCta.disabled = true; adCta.classList.remove('ready'); adCta.textContent = 'Watching…';
  video.removeAttribute('src'); video.load();
}
function leave() { video.pause(); video.removeAttribute('src'); video.load(); clearTimeout(fallbackTimer); audio.duckMusic(false); ctx = null; }

btnWatch.addEventListener('click', () => {
  gift.hidden = true; btnWatch.hidden = true; wrap.hidden = false; lastTime = 0;
  $('#reward-title').textContent = 'Watch the ad to unwrap your card';
  audio.duckMusic(true);
  video.src = pick(GAME.VIDEOS);
  video.controls = false; video.muted = false;
  video.play().catch(() => { video.muted = true; video.play().catch(() => noVideo()); });
  // If a clip fails to load, still reveal the card after a moment.
  fallbackTimer = setTimeout(() => { if (ctx && !ctx.revealed && (video.readyState < 2 || video.error)) noVideo(); }, 6000);
});
video.addEventListener('error', () => noVideo());
video.addEventListener('timeupdate', () => {
  if (!video.duration || !ctx) return;
  fill.style.width = `${(video.currentTime / video.duration) * 100}%`;
  const left = Math.max(0, Math.ceil(video.duration - video.currentTime));
  if (!ctx.ready) { adTimer.textContent = `Reward in ${left}s`; adCta.textContent = `Watching… ${left}s`; }
  if (video.currentTime > lastTime + 1.5) video.currentTime = lastTime; else lastTime = Math.max(lastTime, video.currentTime);
});
video.addEventListener('seeking', () => { if (video.currentTime > lastTime + 0.5) video.currentTime = lastTime; });
video.addEventListener('ended', () => rewardReady());
adCta.addEventListener('click', () => { if (ctx?.ready) revealCard(); });
adClose.addEventListener('click', () => { if (ctx?.ready) revealCard(); });
btnDone.addEventListener('click', () => {
  if (!ctx) return;
  const { planeIdx } = parseCardId(ctx.cardId);
  if (ctx.completes) showScreen('assembly', { planeIdx }); else showScreen('claw');
});

function rewardReady() {
  if (!ctx || ctx.ready) return;
  ctx.ready = true;
  audio.play('chime');
  adTimer.textContent = 'Reward ready!';
  adClose.disabled = false; adClose.classList.add('ready');
  adCta.disabled = false; adCta.classList.add('ready'); adCta.textContent = 'CLAIM REWARD 🎁';
  fill.style.width = '100%';
}
function noVideo() {
  if (!ctx || ctx.revealed) return;
  wrap.hidden = true;
  revealCard();
}
function revealCard() {
  if (!ctx || ctx.revealed) return;
  ctx.revealed = true;
  clearTimeout(fallbackTimer);
  video.pause();
  audio.duckMusic(false);
  const { planeIdx, part } = parseCardId(ctx.cardId);
  $('#reward-title').textContent = ctx.completes ? `🎉 Set complete: ${PLANES[planeIdx].name}!` : 'Here is your card!';
  wrap.hidden = true;
  reveal.hidden = false;
  reveal.replaceChildren(createCardElement({ planeIdx, part, owned: true, big: true }));
  btnDone.hidden = false;
  btnDone.textContent = ctx.completes ? 'Build my plane! 🛠️' : 'Awesome!';
  audio.play('flip'); setTimeout(() => audio.play('fanfare'), 500);
  confettiBurst('big');
}
