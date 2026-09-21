import { registerScreen, $, el } from './ui.js';
import { PLANES } from './planes.js';

registerScreen('credits', {
  enter: () => {
    const body = $('#credits-body');
    body.replaceChildren(
      el('p', { text: 'Made for Trevor with ❤️. Thanks to these free resources:' }),
      el('h3', { text: '3D plane models' }),
      el('ul', {}, PLANES.map((p) => el('li', {}, [`${p.name}: `, el('a', { href: p.url, target: '_blank', rel: 'noopener', text: p.credit }), ` (${p.license})`]))),
      el('p', { html: 'GPLv2 models are redistributed unchanged in spirit (only resized/optimised); the full licence text is in <a href="CREDITS.md" target="_blank">CREDITS.md</a> in the source repository.' }),
      el('h3', { text: 'Pictures' }),
      el('ul', {}, [
        el('li', { html: 'Country flags from <a href="https://flagpedia.net" target="_blank" rel="noopener">Flagpedia / flagcdn.com</a>' }),
        el('li', { html: 'Car logos from the <a href="https://github.com/filippofilip95/car-logos-dataset" target="_blank" rel="noopener">car-logos-dataset</a> (MIT; logos belong to their owners)' }),
        el('li', { html: 'Airline logos from <a href="https://github.com/sexym0nk3y/airline-logos" target="_blank" rel="noopener">airline-logos</a> (logos belong to their owners)' }),
      ]),
      el('h3', { text: 'Code' }),
      el('p', { html: '<a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a>, <a href="https://firebase.google.com" target="_blank" rel="noopener">Firebase</a>, <a href="https://github.com/catdad/canvas-confetti" target="_blank" rel="noopener">canvas-confetti</a>, Fredoka font.' }),
    );
  },
});
