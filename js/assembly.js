// The four card pieces fly together into the whole plane.
import { registerScreen, showScreen, $, confettiBurst } from './ui.js';
import { PLANES } from './planes.js';
import * as audio from './audio.js';
import { THREE, createRenderer, fitRenderer, disposeRenderer, addLights, loadPlane, boxOf, forEachMaterial, partClipPlanes, animate, easeOutBack, easeInOutCubic } from './three-common.js';

let a = null;
const btnDone = $('#btn-assembly-done');
btnDone.addEventListener('click', () => showScreen('collection'));

registerScreen('assembly', {
  enter: async ({ planeIdx = 0 } = {}) => {
    const plane = PLANES[planeIdx];
    $('#assembly-title').textContent = `Building your ${plane.name}…`;
    btnDone.hidden = true;
    const wrap = $('#assembly-canvas-wrap');
    const renderer = createRenderer(wrap);
    const scene = addLights(new THREE.Scene());
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    fitRenderer(renderer, camera, wrap);
    a = { renderer, alive: true, angle: 0.6, radius: 2.7 };
    const onResize = () => fitRenderer(renderer, camera, wrap);
    window.addEventListener('resize', onResize);
    a.cleanup = () => window.removeEventListener('resize', onResize);

    const pieces = [];
    for (let part = 1; part <= 4; part++) {
      const obj = await loadPlane(plane);
      if (!a?.alive) return;
      const box = boxOf(obj);
      obj.userData.box = box; obj.userData.part = part;
      obj.userData.planes = partClipPlanes(box, part);
      forEachMaterial(obj, (mat) => { mat.clippingPlanes = obj.userData.planes; });
      // Start scattered: spread along X plus a little vertical/depth offset.
      obj.userData.start = new THREE.Vector3((2.5 - part) * 0.55, (part % 2 ? 0.35 : -0.35), (part % 2 ? -0.25 : 0.25));
      obj.position.copy(obj.userData.start);
      scene.add(obj);
      pieces.push(obj);
    }
    const target = new THREE.Vector3(0, 0, 0);
    const updateClips = () => { for (const o of pieces) { const [hi, lo] = partClipPlanes(o.userData.box, o.userData.part, o.position.x); o.userData.planes[0].constant = hi.constant; o.userData.planes[1].constant = lo.constant; } };
    (function loop() {
      if (!a?.alive) return;
      camera.position.set(Math.sin(a.angle) * a.radius, 0.35 * a.radius, Math.cos(a.angle) * a.radius);
      camera.lookAt(target);
      updateClips();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    })();

    await animate(900, () => {});
    audio.play('whoosh');
    await animate(2200, (t, raw) => { for (const o of pieces) o.position.copy(o.userData.start).multiplyScalar(1 - t); if (a) a.radius = 2.7 - 1.1 * raw; }, easeOutBack);
    if (!a?.alive) return;
    for (const o of pieces) { o.position.set(0, 0, 0); forEachMaterial(o, (mat) => { mat.clippingPlanes = null; }); }
    pieces.slice(1).forEach((o) => scene.remove(o));
    $('#assembly-title').textContent = `${plane.emoji} ${plane.name} complete!`;
    confettiBurst('big'); audio.play('bigwin');
    btnDone.hidden = false;
    await animate(6000, (t, raw) => { a && (a.angle = 0.6 + raw * Math.PI * 2 * 1.5); }, (t) => t);
    (function spin() { if (!a?.alive) return; a.angle += 0.01; requestAnimationFrame(spin); })();
  },
  leave: () => { if (a) { a.alive = false; a.cleanup?.(); disposeRenderer(a.renderer); a = null; } },
});
