// After a claw win: watch a video (no skipping), then the card flips over.
import { GAME } from './config.js';
import { registerScreen, showScreen, $, pick, confettiBurst } from './ui.js';
import { parseCardId } from './cards.js';
import { createCardElement } from './cardRender.js';
import { PLANES } from './planes.js';

const video = $('#reward-video'), wrap = $('#video-wrap'), fill = $('#video-progress-fill');
const btnWatch = $('#btn-watch'), btnDone = $('#btn-done') || $('#btn-reward-done'), reveal = $('#card-reveal');
let ctx = null, lastTime = 0, fallbackTimer = 0;

registerScreen('reward', { enter, leave });

function enter({ cardId, completes = false } = {}) {
  ctx = { cardId, completes, revealed: false };
  const { planeIdx } = parseCardId(cardId);
  $('#reward-title').textContent = `You won a ${PLANES[planeIdx].name} card! 🎁`;
  btnWatch.hidden = false; wrap.hidden = true; reveal.hidden = true; btnDone.hidden = true;
  reveal.replaceChildren(); fill.style.width = '0';
  video.removeAttribute('src'); video.load();
}
function leave() { video.pause(); video.removeAttribute('src'); video.load(); clearTimeout(fallbackTimer); ctx = null; }

btnWatch.addEventListener('click', () => {
  btnWatch.hidden = true; wrap.hidden = false; lastTime = 0;
  video.src = pick(GAME.VIDEOS);
  video.controls = false; video.muted = false;
  video.play().catch(() => { video.muted = true; video.play().catch(() => noVideo()); });
  // If the videos have not been added yet (or fail), still reveal the card after a moment.
  fallbackTimer = setTimeout(() => { if (ctx && !ctx.revealed && (video.readyState < 2 || video.error)) noVideo(); }, 6000);
});
video.addEventListener('error', () => noVideo());
video.addEventListener('timeupdate', () => {
  if (!video.duration) return;
  fill.style.width = `${(video.currentTime / video.duration) * 100}%`;
  if (video.currentTime > lastTime + 1.5) video.currentTime = lastTime; else lastTime = Math.max(lastTime, video.currentTime);
});
video.addEventListener('seeking', () => { if (video.currentTime > lastTime + 0.5) video.currentTime = lastTime; });
video.addEventListener('ended', () => revealCard());
btnDone.addEventListener('click', () => {
  if (!ctx) return;
  const { planeIdx } = parseCardId(ctx.cardId);
  if (ctx.completes) showScreen('assembly', { planeIdx }); else showScreen('claw');
});

function noVideo() {
  if (!ctx || ctx.revealed) return;
  wrap.hidden = true;
  revealCard();
}
function revealCard() {
  if (!ctx || ctx.revealed) return;
  ctx.revealed = true;
  clearTimeout(fallbackTimer);
  const { planeIdx, part } = parseCardId(ctx.cardId);
  $('#reward-title').textContent = ctx.completes ? `🎉 Set complete: ${PLANES[planeIdx].name}!` : 'Here is your card!';
  wrap.hidden = true;
  reveal.hidden = false;
  reveal.replaceChildren(createCardElement({ planeIdx, part, owned: true, big: true }));
  btnDone.hidden = false;
  btnDone.textContent = ctx.completes ? 'Build my plane! 🛠️' : 'Awesome!';
  confettiBurst('big');
}
