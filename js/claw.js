// Claw machine: a glass cabinet full of toy planes. One coin per try, 50% win chance.
import { GAME } from './config.js';
import { registerScreen, showScreen, $, toast, sleep } from './ui.js';
import { state, coins, markDirty, save, refreshHud } from './store.js';
import { PLANES } from './planes.js';
import { pickDrop, addCard, allOwned } from './cards.js';
import { evaluateBadges } from './badges.js';
import * as audio from './audio.js';
import { THREE, createRenderer, fitRenderer, disposeRenderer, addLights, loadPlane, animate, easeOutCubic, easeInOutCubic, easeOutBack } from './three-common.js';

const W = 3.2, D = 2.2, H = 2.6;              // cabinet inner size
const TOY_SCALE = 0.62;
let g = null;                                 // per-visit scene graph state
const btnDrop = $('#btn-drop'), msg = $('#claw-msg');

registerScreen('claw', { enter, leave });
btnDrop.addEventListener('click', () => drop());

function setMsg(t) { msg.textContent = t; }
function updateCoins() {
  $('#claw-coins').textContent = `🪙 ${coins()}`;
  btnDrop.disabled = !g || g.busy || coins() < 1;
  if (coins() < 1) setMsg('Play the quiz to earn coins — 3 points = 1 coin');
  else if (allOwned(state.profile)) setMsg('🏆 Bonus round! Win extra sets of your planes');
}

function toyPositions() {
  // 10 spots in a loose 4-3-3 grid with a little jitter so it looks like a pile.
  const spots = [];
  const rows = [[-1.15, -0.4, 0.4, 1.15], [-0.8, 0, 0.8], [-1.15, -0.4, 0.4, 1.15]];
  const zs = [-0.65, 0, 0.65];
  rows.forEach((xs, r) => xs.forEach((x) => spots.push([x, zs[r]])));
  return spots.slice(0, 10);
}

function buildClaw() {
  const claw = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.7, roughness: 0.35 });
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  cable.name = 'cable';
  claw.add(cable);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 }));
  claw.add(hub);
  const prongs = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.05), metal);
    arm.position.set(0.14, -0.15, 0);
    arm.rotation.z = 0.25;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.05), metal);
    tip.position.set(0.19, -0.35, 0);
    tip.rotation.z = -0.9;
    pivot.add(arm, tip);
    prongs.add(pivot);
  }
  prongs.name = 'prongs';
  claw.add(prongs);
  claw.userData.prongs = prongs;
  return claw;
}

function setProngs(claw, open) { // open: 0 closed … 1 open
  claw.userData.prongs.children.forEach((p) => { p.rotation.z = -0.55 + open * 0.75; });
}
function setCable(claw, topY) { // stretch the cable from the hub up to the cabinet ceiling
  const cable = claw.getObjectByName('cable');
  const len = Math.max(0.01, topY - claw.position.y);
  cable.scale.y = len; cable.position.y = len / 2;
}

async function enter() {
  const wrap = $('#claw-canvas-wrap');
  const renderer = createRenderer(wrap);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1b4b);
  addLights(scene, 1.1);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
  const fit = () => { fitRenderer(renderer, camera, wrap); const back = Math.max(1, Math.sqrt(1.3 / camera.aspect)); camera.position.set(0, 2.0 * back, 3.9 * back); camera.lookAt(0, 0.8, 0); };
  fit();

  // Cabinet
  const cab = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 }));
  floor.position.y = -0.06;
  cab.add(floor);
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.7, D + 0.3), new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.6 }));
  base.position.y = -0.47;
  cab.add(base);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.9 }));
  back.position.set(0, H / 2, -D / 2);
  cab.add(back);
  for (const [x, ry] of [[-W / 2, Math.PI / 2], [W / 2, -Math.PI / 2]]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), glassMat);
    side.position.set(x, H / 2, 0); side.rotation.y = ry;
    cab.add(side);
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
  front.position.set(0, H / 2, D / 2);
  cab.add(front);
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.16, D + 0.3), new THREE.MeshStandardMaterial({ color: 0xdb2777 }));
  top.position.y = H + 0.08;
  cab.add(top);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, metalness: 0.3 });
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, H, 0.1), frameMat);
    post.position.set(x, H / 2, z);
    cab.add(post);
  }
  // Prize chute (front-left corner)
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.6), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  chute.position.set(-W / 2 + 0.4, 0.01, D / 2 - 0.4);
  cab.add(chute);
  const chuteRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0xfde047 }));
  chuteRim.rotation.x = Math.PI / 2; chuteRim.position.copy(chute.position).setY(0.03);
  cab.add(chuteRim);
  scene.add(cab);

  // Neon sign
  const claw = buildClaw();
  claw.position.set(0, H - 0.45, 0);
  setProngs(claw, 1); setCable(claw, H);
  scene.add(claw);

  g = { renderer, scene, camera, claw, toys: new Map(), busy: true, alive: true, sweepT: 0, sweeping: true, chute: chute.position.clone() };
  setMsg('Loading toys…');
  updateCoins();

  // Toys
  const spots = toyPositions();
  await Promise.all(PLANES.map(async (plane, i) => {
    try {
      const m = await loadPlane(plane);
      if (!g?.alive) return;
      const s = TOY_SCALE * (0.7 + 0.3 * (i / 9));
      m.scale.setScalar(s);
      const box = new THREE.Box3().setFromObject(m);
      m.position.set(spots[i][0], -box.min.y + 0.001, spots[i][1]);
      m.rotation.y = (Math.random() - 0.5) * 1.2 + (i % 2 ? Math.PI : 0);
      scene.add(m);
      g.toys.set(plane.idx, m);
    } catch (e) { console.error('toy failed', plane.id, e); }
  }));
  if (!g?.alive) return;
  g.busy = false;
  setMsg('Press DROP when the claw is over a plane!');
  updateCoins();

  window.addEventListener('resize', fit);
  g.cleanup = () => window.removeEventListener('resize', fit);
  let last = performance.now();
  (function loop(now) {
    if (!g?.alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (g.sweeping) { g.sweepT += dt; claw.position.x = Math.sin(g.sweepT * 1.3) * (W / 2 - 0.35); }
    setCable(claw, H);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })(last);
}

function leave() {
  if (!g) return;
  g.alive = false; g.cleanup?.();
  g.renderer.domElement.remove();
  disposeRenderer(g.renderer);
  g = null;
}

async function drop() {
  if (!g || g.busy || coins() < 1) return;
  const p = state.profile;
  const card = pickDrop(p);
  if (!card) { updateCoins(); return; }
  g.busy = true; g.sweeping = false; btnDrop.disabled = true;
  p.coinsSpent++; p.clawTries = (p.clawTries || 0) + 1;
  markDirty(); save(true); refreshHud(); $('#claw-coins').textContent = `🪙 ${coins()}`;

  const win = Math.random() < GAME.CLAW_WIN_CHANCE;
  const toy = g.toys.get(card.planeIdx);
  const { claw } = g;
  const target = toy ? toy.position.clone() : new THREE.Vector3(claw.position.x, 0, 0);
  const toyBox = toy ? new THREE.Box3().setFromObject(toy) : null;
  const grabY = toyBox ? toyBox.max.y + 0.32 : 0.6;
  const topY = H - 0.45;
  const start = claw.position.clone();

  setMsg('Going for it…');
  audio.play('motor');
  await animate(600, (t) => { claw.position.x = start.x + (target.x - start.x) * t; claw.position.z = start.z + (target.z - start.z) * t; });
  audio.play('motor');
  await animate(900, (t) => { claw.position.y = topY + (grabY - topY) * t; }, easeInOutCubic);
  audio.play('grab');
  await animate(350, (t) => setProngs(claw, 1 - t * 0.85), easeOutCubic);
  if (!g?.alive) return;
  const toyStart = toy?.position.clone();
  const lift = win ? topY : topY - (topY - grabY) * 0.45;
  audio.play('motor');
  await animate(900, (t) => { claw.position.y = grabY + (lift - grabY) * t; if (toy) toy.position.y = toyStart.y + (lift - grabY) * t; }, easeInOutCubic);
  if (!g?.alive) return;

  if (win) {
    setMsg('Got it! 🎉');
    audio.play('fanfare');
    const from = claw.position.clone(), toyFrom = toy?.position.clone();
    await animate(1000, (t) => {
      claw.position.x = from.x + (g.chute.x - from.x) * t; claw.position.z = from.z + (g.chute.z - from.z) * t;
      if (toy) { toy.position.x = toyFrom.x + (g.chute.x - toyFrom.x) * t; toy.position.z = toyFrom.z + (g.chute.z - toyFrom.z) * t; }
    });
    await animate(300, (t) => setProngs(claw, 0.15 + t * 0.85), easeOutCubic);
    audio.play('drop');
    if (toy) { const y0 = toy.position.y; await animate(500, (t) => { toy.position.y = y0 - (y0 + 0.6) * t; toy.scale.multiplyScalar(0.985); }, easeInOutCubic); }
    const { completes, setNumber, copies } = addCard(p, card.id);
    p.clawWins = (p.clawWins || 0) + 1; p.clawStreak = (p.clawStreak || 0) + 1;
    markDirty(); await save(true);
    evaluateBadges();
    showScreen('reward', { cardId: card.id, completes, setNumber, copies });
  } else {
    setMsg('Oh no, it slipped! 😅');
    audio.play('lose');
    await animate(180, (t) => setProngs(claw, 0.15 + t * 0.85));
    if (toy) { const y0 = toy.position.y; await animate(450, (t) => { toy.position.y = Math.max(toyStart.y, y0 - (y0 - toyStart.y) * t); }, easeOutBack); toy.position.y = toyStart.y; }
    await animate(700, (t) => { claw.position.y = lift + (topY - lift) * t; }, easeInOutCubic);
    p.clawStreak = 0; markDirty(); save(true);
    evaluateBadges();
    if (!g?.alive) return;
    g.busy = false; g.sweeping = true;
    updateCoins();
    if (coins() >= 1) setMsg('So close! Try again?');
  }
}
