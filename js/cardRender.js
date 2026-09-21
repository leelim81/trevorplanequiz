// Renders trading-card pictures: one quarter of a plane model, sliced with clipping planes.
import { THREE, addLights, loadPlane, boxOf, forEachMaterial, partClipPlanes, partRange, slabBox } from './three-common.js';
import { PLANES } from './planes.js';
import { partName, partNumber } from './cards.js';
import { el } from './ui.js';

const SIZE = 512;
const cache = new Map();
let renderer = null, scene = null, camera = null;
let queue = Promise.resolve();

function ensure() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = addLights(new THREE.Scene());
  camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
}

async function renderOne(planeIdx, part, silhouette) {
  ensure();
  const plane = PLANES[planeIdx];
  const obj = await loadPlane(plane);
  const box = boxOf(obj);
  const clip = partClipPlanes(box, part);
  forEachMaterial(obj, (mat, mesh) => {
    if (silhouette) {
      mesh.material = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide, clippingPlanes: clip });
    } else {
      mat.clippingPlanes = clip;
    }
  });
  const { xLo, xHi } = partRange(box, part);
  const sb = slabBox(obj, xLo, xHi);
  const centre = sb.getCenter(new THREE.Vector3());
  const size = sb.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 0.05) * 0.62;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
  // Three-quarter view from the front-right, slightly above; nose points +X.
  const dir = new THREE.Vector3(0.9, 0.55, 1.0).normalize();
  camera.position.copy(centre).addScaledVector(dir, dist);
  camera.lookAt(centre);
  scene.add(obj);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(obj);
  return url;
}

// Serialised so the single offscreen renderer is never used concurrently.
export function renderCardImage(planeIdx, part, { silhouette = false } = {}) {
  const key = `${planeIdx}-${part}-${silhouette ? 's' : 'c'}`;
  if (cache.has(key)) return cache.get(key);
  const p = queue.then(() => renderOne(planeIdx, part, silhouette)).catch((e) => { console.error('card render failed', e); cache.delete(key); return ''; });
  queue = p.then(() => {});
  cache.set(key, p);
  return p;
}

export function preloadCards(planeIdx, owned) {
  for (const part of [1, 2, 3, 4]) renderCardImage(planeIdx, part, { silhouette: !owned.includes(part) });
}

// Builds a .tcard element; the picture fills in when the render finishes.
export function createCardElement({ planeIdx, part, owned = true, big = false, placeholder = false }) {
  const plane = PLANES[planeIdx];
  const card = el('div', { class: `tcard ${owned ? '' : 'locked'} ${big ? 'big' : ''}`, style: `--c1:${plane.colors[0]};--c2:${plane.colors[1]}` });
  const imgWrap = el('div', { class: 'tcard-img' });
  card.append(imgWrap,
    el('div', { class: 'tcard-name', text: plane.name }),
    el('div', { class: 'tcard-part' }, [el('span', { text: owned ? partName(part) : '???' }), el('span', { class: 'tcard-no', text: partNumber(plane, part) })]));
  if (placeholder) {
    imgWrap.append(el('div', { text: '❓', style: 'font-size:2.2rem' }));
  } else {
    const img = el('img', { alt: `${plane.name} ${partName(part)}` });
    imgWrap.append(img);
    renderCardImage(planeIdx, part, { silhouette: !owned }).then((url) => { if (url) img.src = url; else img.replaceWith(el('div', { text: plane.emoji, style: 'font-size:2.2rem' })); });
  }
  return card;
}
