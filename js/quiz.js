import { GAME } from './config.js';
import { registerScreen, showScreen, $, $$, toast, confettiBurst, shuffle, weightedPick, sleep, updateHud } from './ui.js';
import { questionsFor, categoryLabel } from './data.js';
import { state, markDirty, save, refreshHud, coins } from './store.js';
import { createTimer } from './timer.js';
import { evaluateBadges } from './badges.js';

let run = null, current = null, locked = false, timer = null;
let lastCategory = 'mixed';
const img = $('#quiz-image'), feedback = $('#quiz-feedback'), choiceBtns = $$('.btn-choice');

export const getLastCategory = () => lastCategory;

registerScreen('quiz', {
  enter: ({ category = 'mixed' } = {}) => startRun(category),
  leave: () => { timer?.reset(); if (run && !run.over) endRun({ quiet: true }); },
});

choiceBtns.forEach((b) => b.addEventListener('click', () => answer(+b.dataset.i)));
$('#btn-quit').addEventListener('click', () => { if (run && !run.over) { timer.stop(); endRun(); } });

function weight(q) {
  const [c, w] = state.stats.q[q.id] || [0, 0];
  return Math.min(4, Math.max(1 / 256, 0.25 ** (c - w)));
}

async function startRun(category) {
  timer ??= createTimer({ fill: $('#timer-fill'), bonus: $('#timer-bonus') });
  lastCategory = category;
  run = { category, score: 0, lives: GAME.LIVES, count: 0, streak: 0, fastStreak: 0, lastQid: null, over: false, pointsEarned: 0, coinsBefore: coins() };
  $('#quiz-cat').textContent = categoryLabel(category);
  updateScore();
  await nextQuestion();
}

function updateScore() {
  $('#quiz-score').textContent = `Score ${run.score}`;
  updateHud({ lives: run.lives });
}

async function nextQuestion() {
  const pool = questionsFor(run.category).filter((q) => q.id !== run.lastQid);
  const q = weightedPick(pool, weight);
  const others = shuffle(questionsFor(q.cat).filter((x) => x.id !== q.id && x.label !== q.label)).slice(0, 3);
  const choices = shuffle([q, ...others]);
  current = { q, choices, correctIdx: choices.indexOf(q) };
  run.lastQid = q.id;

  feedback.className = 'quiz-feedback';
  choiceBtns.forEach((b, i) => { b.textContent = choices[i].label; b.className = 'btn btn-choice'; b.disabled = false; });
  img.src = q.img;
  try { await Promise.race([img.decode(), sleep(1500)]); } catch { /* broken image: still ask */ }
  if (run.over) return;
  locked = false;
  timer.start(onTimeout);
}

function showFeedback(kind, symbol) {
  feedback.textContent = symbol;
  feedback.className = `quiz-feedback show ${kind}`;
}

async function answer(i) {
  if (locked || !current || run.over) return;
  locked = true;
  const elapsed = timer.stop();
  await resolve(i, elapsed);
}

async function onTimeout() {
  if (locked || run.over) return;
  locked = true;
  await resolve(-1, GAME.TIMER_MS);
}

async function resolve(chosen, elapsed) {
  const { q, correctIdx } = current;
  const correct = chosen === correctIdx;
  const fast = correct && elapsed <= GAME.BONUS_MS;
  const p = state.profile;
  const stat = state.stats.q[q.id] || [0, 0];
  state.stats.q[q.id] = [stat[0] + (correct ? 1 : 0), stat[1] + (correct ? 0 : 1)];

  choiceBtns.forEach((b) => (b.disabled = true));
  choiceBtns[correctIdx].classList.add('correct');
  if (correct) {
    const pts = fast ? 2 : 1;
    const coinsBefore = coins();
    run.score += pts; run.pointsEarned += pts; run.streak++; run.fastStreak = fast ? run.fastStreak + 1 : 0;
    p.totalPoints += pts; p.correctTotal++;
    showFeedback('ok', fast ? '⚡' : '✅');
    if (fast) confettiBurst('bonus');
    if (coins() > coinsBefore) toast('🪙 +1 coin!');
  } else {
    if (chosen >= 0) choiceBtns[chosen].classList.add('wrong');
    run.lives--; run.streak = 0; run.fastStreak = 0; p.wrongTotal++;
    showFeedback('bad', chosen < 0 ? '⏰' : '❌');
  }
  run.count++;
  markDirty();
  if (run.count % GAME.FLUSH_EVERY === 0) save();
  updateScore(); refreshHud();
  evaluateBadges({ fastStreak: run.fastStreak, runStreak: run.streak, runScore: run.score });

  await sleep(correct ? 700 : 1200);
  if (run.over) return;
  if (run.lives <= 0) endRun();
  else await nextQuestion();
}

function endRun({ quiet = false } = {}) {
  if (!run || run.over) return;
  run.over = true;
  timer.reset();
  const p = state.profile;
  p.runs = (p.runs || 0) + 1;
  const newBest = run.score > (p.bestRun || 0);
  if (newBest) p.bestRun = run.score;
  markDirty(); save(true);
  evaluateBadges({ runScore: run.score, runStreak: run.streak, fastStreak: run.fastStreak });
  refreshHud();
  if (quiet) return;
  $('#go-score').textContent = run.score;
  $('#go-best').textContent = newBest ? '🎉 New best score!' : `Best score: ${p.bestRun}`;
  const coinsEarned = coins() - run.coinsBefore;
  $('#go-earned').textContent = `+${run.pointsEarned} points · +${coinsEarned} coins`;
  showScreen('gameover');
}
