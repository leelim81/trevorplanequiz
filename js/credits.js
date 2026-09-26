import { registerScreen, $, el } from './ui.js';
import { PLANES } from './planes.js';

// 63 planes is too long to list one by one, so credit each source once and name the planes under it.
function bySource() {
  const groups = new Map();
  for (const p of PLANES) {
    const key = `${p.url}|${p.license}`;
    if (!groups.has(key)) groups.set(key, { url: p.url, license: p.license, source: p.credit.replace(/^.*? from /, ''), planes: [] });
    groups.get(key).planes.push(p.name);
  }
  return [...groups.values()].sort((a, b) => b.planes.length - a.planes.length);
}

registerScreen('credits', {
  enter: () => {
    $('#credits-body').replaceChildren(
      el('p', { text: 'Made for Trevor with ❤️. Thanks to these free resources:' }),
      el('h3', { text: `3D plane models (${PLANES.length} planes)` }),
      el('ul', {}, bySource().map((g) => el('li', {}, [
        el('a', { href: g.url, target: '_blank', rel: 'noopener', text: g.source }),
        ` — ${g.license}, ${g.planes.length} plane${g.planes.length > 1 ? 's' : ''}`,
        el('div', { class: 'credit-planes', text: g.planes.join(', ') }),
      ]))),
      el('p', { html: 'The GPLv2 models are redistributed with only format and size changes; the full licence text and the exact download steps are in <a href="CREDITS.md" target="_blank">CREDITS.md</a> and <code>tools/prepare-models.sh</code> in the source repository.' }),
      el('h3', { text: 'Pictures' }),
      el('ul', {}, [
        el('li', { html: 'Country flags from <a href="https://flagpedia.net" target="_blank" rel="noopener">Flagpedia / flagcdn.com</a>' }),
        el('li', { html: 'Car logos from the <a href="https://github.com/filippofilip95/car-logos-dataset" target="_blank" rel="noopener">car-logos-dataset</a> (MIT; logos belong to their owners)' }),
        el('li', { html: 'Airline logos from <a href="https://github.com/sexym0nk3y/airline-logos" target="_blank" rel="noopener">airline-logos</a> (logos belong to their owners)' }),
      ]),
      el('h3', { text: 'Code' }),
      el('p', { html: '<a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a>, <a href="https://firebase.google.com" target="_blank" rel="noopener">Firebase</a>, <a href="https://github.com/catdad/canvas-confetti" target="_blank" rel="noopener">canvas-confetti</a>, Fredoka and Baloo 2 fonts. Sound effects and music are generated in the browser with the Web Audio API.' }),
    );
  },
});
