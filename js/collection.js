import { registerScreen, showScreen, $, el } from './ui.js';
import { state } from './store.js';
import { PLANES } from './planes.js';
import { ownedParts, planeCount, cardCount, cardId, ensureCardCounts } from './cards.js';
import { createCardElement } from './cardRender.js';
import { THREE, createRenderer, fitRenderer, disposeRenderer, addLights, loadPlane } from './three-common.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export async function renderCollectionGrid(container, profile, { readOnly = false, from = 'collection' } = {}) {
  profile = ensureCardCounts({ ...profile, cardCounts: { ...(profile.cardCounts || {}) } });
  const ownedCards = profile.ownedCards || [];
  container.replaceChildren(...PLANES.map((plane) => {
    const owned = ownedParts(plane.idx, ownedCards);
    const complete = owned.length === 4;
    const sets = complete ? planeCount(profile, plane.idx) : 0;
    const head = el('div', { class: 'plane-row-head' }, [
      el('span', { text: plane.emoji, style: 'font-size:1.6rem' }),
      el('h3', { text: plane.name }),
      complete ? el('span', { class: 'done', text: 'Complete!' }) : el('span', { class: 'count', text: `${owned.length}/4` }),
      sets > 1 ? el('span', { class: 'times', text: `×${sets}` }) : null,
    ]);
    if (complete) head.append(el('button', { class: 'btn btn-view3d', text: '🔍 View 3D', onclick: () => showScreen('viewer', { planeIdx: plane.idx, from }) }));
    const cards = el('div', { class: 'plane-cards' }, [1, 2, 3, 4].map((part) =>
      createCardElement({ planeIdx: plane.idx, part, owned: owned.includes(part), placeholder: owned.length === 0, count: cardCount(profile, cardId(plane.idx, part)) })));
    return el('div', { class: 'plane-row' }, [head, cards]);
  }));
}

registerScreen('collection', {
  enter: () => renderCollectionGrid($('#collection-grid'), state.profile, { from: 'collection' }),
});

// ---------- 3D viewer for completed planes ----------
let viewer = null;
$('#btn-viewer-back').addEventListener('click', () => showScreen(viewer?.from || 'collection'));

registerScreen('viewer', {
  enter: async ({ planeIdx = 0, from = 'collection' } = {}) => {
    const plane = PLANES[planeIdx];
    $('#viewer-title').textContent = `${plane.emoji} ${plane.name}`;
    const wrap = $('#viewer-canvas-wrap');
    const renderer = createRenderer(wrap);
    const scene = addLights(new THREE.Scene());
    scene.background = new THREE.Color(0x7dd3fc);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(0.9, 0.5, 1.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 2.5;
    controls.minDistance = 0.5; controls.maxDistance = 4;
    fitRenderer(renderer, camera, wrap);
    viewer = { renderer, from, alive: true };
    const model = await loadPlane(plane);
    if (!viewer.alive) return;
    scene.add(model);
    const onResize = () => fitRenderer(renderer, camera, wrap);
    window.addEventListener('resize', onResize);
    viewer.cleanup = () => window.removeEventListener('resize', onResize);
    (function loop() { if (!viewer?.alive) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); })();
  },
  leave: () => { if (viewer) { viewer.alive = false; viewer.cleanup?.(); disposeRenderer(viewer.renderer); viewer = null; } },
});
