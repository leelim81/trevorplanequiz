// Shared Three.js helpers: renderer factory, plane loading/normalising, lights, tweening.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const masters = new Map(); // plane.id -> Promise<Group> normalised master copy

export function createRenderer(container, { alpha = false, preserveDrawingBuffer = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha, preserveDrawingBuffer, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (container) container.replaceChildren(renderer.domElement);
  return renderer;
}

export function fitRenderer(renderer, camera, container) {
  const w = container.clientWidth || 300, h = container.clientHeight || 300;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

export function disposeRenderer(renderer) {
  if (!renderer) return;
  renderer.dispose();
  renderer.forceContextLoss?.();
  renderer.domElement?.remove();
}

export function addLights(scene, intensity = 1) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1 * intensity));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2 * intensity);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfe4ff, 0.8 * intensity);
  fill.position.set(-4, 2, -3);
  scene.add(fill);
  return scene;
}

// Turns a model so its nose points +X without hand-tuning: the longest horizontal axis becomes X,
// then whichever half carries the tall tail fin is put at -X.
function autoOrient(wrapper, scene) {
  wrapper.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
  if (size.z > size.x) { scene.rotation.y = Math.PI / 2; wrapper.updateMatrixWorld(true); }
  const box = new THREE.Box3().setFromObject(wrapper);
  const cx = (box.min.x + box.max.x) / 2;
  let frontTop = -Infinity, backTop = -Infinity;
  const v = new THREE.Vector3();
  wrapper.traverse((m) => {
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 4000)); // sample, big meshes don't need every vertex
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.x > cx) frontTop = Math.max(frontTop, v.y); else backTop = Math.max(backTop, v.y);
    }
  });
  if (frontTop > backTop) { scene.rotation.y += Math.PI; wrapper.updateMatrixWorld(true); }
}

// Applies the rotation (from the manifest, or worked out automatically when `rot` is null),
// scales the model so its nose→tail length (X) is 1, and centres it.
function normalise(scene, plane) {
  const wrapper = new THREE.Group();
  wrapper.name = `plane:${plane.id}`;
  wrapper.add(scene);
  if (plane.rot) scene.rotation.set(...plane.rot.map(THREE.MathUtils.degToRad));
  else autoOrient(wrapper, scene);
  wrapper.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  scene.scale.setScalar(1 / Math.max(size.x, 1e-6));
  wrapper.updateMatrixWorld(true);
  const centre = new THREE.Box3().setFromObject(wrapper).getCenter(new THREE.Vector3());
  scene.position.sub(centre);
  wrapper.updateMatrixWorld(true);
  scene.traverse((m) => {
    if (!m.isMesh) return;
    m.frustumCulled = false;
    for (const mat of [].concat(m.material)) {
      mat.side = THREE.DoubleSide;
      if (mat.color && mat.color.r === 0 && mat.color.g === 0 && mat.color.b === 0 && !mat.map) mat.color.set(0xdddddd);
      if (mat.transparent && mat.opacity < 0.05) mat.visible = false;
    }
  });
  return wrapper;
}

export function loadPlaneMaster(plane) {
  if (!masters.has(plane.id)) {
    masters.set(plane.id, loader.loadAsync(plane.file).then((g) => normalise(g.scene, plane)).catch((e) => { masters.delete(plane.id); throw e; }));
  }
  return masters.get(plane.id);
}

// Returns an independent copy (shared geometry, cloned materials) so clipping/tinting is per instance.
export async function loadPlane(plane) {
  const master = await loadPlaneMaster(plane);
  const copy = master.clone(true);
  copy.traverse((m) => {
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
  });
  copy.updateMatrixWorld(true);
  return copy;
}

export function boxOf(obj) { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); }

export function forEachMaterial(obj, fn) {
  obj.traverse((m) => { if (m.isMesh) for (const mat of [].concat(m.material)) fn(mat, m); });
}

// Clipping planes that keep only the k-th quarter (1 = nose … 4 = tail) along X of `box`.
export function partClipPlanes(box, part, offsetX = 0) {
  const q = (box.max.x - box.min.x) / 4;
  const xHi = box.max.x - (part - 1) * q + offsetX;
  const xLo = box.max.x - part * q + offsetX;
  return [new THREE.Plane(new THREE.Vector3(-1, 0, 0), xHi), new THREE.Plane(new THREE.Vector3(1, 0, 0), -xLo)];
}
export function partRange(box, part) {
  const q = (box.max.x - box.min.x) / 4;
  return { xHi: box.max.x - (part - 1) * q, xLo: box.max.x - part * q, q };
}

// Bounding box of the geometry that lies inside x∈[xLo,xHi] (world space).
export function slabBox(obj, xLo, xHi) {
  const out = new THREE.Box3();
  const v = new THREE.Vector3();
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.x >= xLo && v.x <= xHi) out.expandByPoint(v);
    }
  });
  if (out.isEmpty()) { out.min.set(xLo, -0.1, -0.1); out.max.set(xHi, 0.1, 0.1); }
  return out;
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// Runs fn(progress 0..1) every frame for `ms`, resolves when done. `signal` aborts.
export function animate(ms, fn, ease = easeInOutCubic, signal) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    function step(now) {
      if (signal?.aborted) return resolve(false);
      const t = Math.min(1, (now - t0) / ms);
      fn(ease(t), t);
      if (t < 1) requestAnimationFrame(step); else resolve(true);
    }
    requestAnimationFrame(step);
  });
}

export { THREE };
