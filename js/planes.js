// The 10 collectable planes, smallest to largest. `rot` (degrees, applied x/y/z) turns the raw
// model so its nose points +X and its top points +Y before the loader normalises size.
export const PARTS = ['Nose', 'Wings', 'Fuselage', 'Tail'];

export const PLANES = [
  { idx: 0, id: 'bumblebee', name: 'Bumble Bee', code: 'BB', file: 'assets/models/bumblebee.glb', rot: [0, 180, 0], colors: ['#fde047', '#ca8a04'], emoji: '🐝',
    desc: 'The tiniest plane in the hangar!', credit: 'Airco DH2 v2 by Joshua Johanson', url: 'https://poly.pizza/m/9iVI9GHMleJ', license: 'CC-BY 3.0' },
  { idx: 1, id: 'pipercub', name: 'Piper Cub', code: 'CUB', file: 'assets/models/pipercub.glb', rot: [0, -90, 0], colors: ['#fbbf24', '#b45309'], emoji: '🛩️',
    desc: 'A little yellow plane everyone learns to fly in.', credit: 'PA-18 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 2, id: 'cessna172', name: 'Cessna 172', code: 'C172', file: 'assets/models/cessna172.glb', rot: [0, -90, 0], colors: ['#60a5fa', '#1d4ed8'], emoji: '🛩️',
    desc: 'The most-built plane ever.', credit: 'C182 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 3, id: 'p40', name: 'P-40 Warhawk', code: 'P40', file: 'assets/models/p40.glb', rot: [0, -90, 0], colors: ['#84cc16', '#3f6212'], emoji: '🦈',
    desc: 'A WWII fighter with a shark mouth.', credit: 'P-40 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 4, id: 'learjet', name: 'Learjet 45', code: 'LJ45', file: 'assets/models/learjet.glb', rot: [0, -90, 0], colors: ['#e2e8f0', '#475569'], emoji: '💼',
    desc: 'A speedy private jet.', credit: 'Citation II from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 5, id: 'b737', name: 'Boeing 737', code: 'B737', file: 'assets/models/b737.glb', rot: [0, -90, 0], colors: ['#38bdf8', '#0369a1'], emoji: '✈️',
    desc: 'The world\'s most popular airliner.', credit: 'B737 from Flightradar24 3D models', url: 'https://github.com/Flightradar24/fr24-3d-models', license: 'GPLv2' },
  { idx: 6, id: 'b787', name: 'Boeing 787 Dreamliner', code: 'B787', file: 'assets/models/b787.glb', rot: [0, -90, 0], colors: ['#2dd4bf', '#0f766e'], emoji: '✈️',
    desc: 'Bendy wings and big windows.', credit: 'B788 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 7, id: 'b747', name: 'Boeing 747 Jumbo', code: 'B747', file: 'assets/models/b747.glb', rot: [0, -90, 0], colors: ['#f472b6', '#9d174d'], emoji: '🐘',
    desc: 'The Queen of the Skies, with a hump!', credit: 'B747 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 8, id: 'a380', name: 'Airbus A380', code: 'A380', file: 'assets/models/a380.glb', rot: [0, -90, 0], colors: ['#a78bfa', '#5b21b6'], emoji: '🏢',
    desc: 'A double-decker for 500 people.', credit: 'A380 from FlightAirMap 3D models (FlightGear)', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels', license: 'GPLv2' },
  { idx: 9, id: 'an225', name: 'Antonov An-225 Mriya', code: 'AN225', file: 'assets/models/an225.glb', rot: [0, -90, 0], colors: ['#fb923c', '#9a3412'], emoji: '🐉',
    desc: 'The biggest plane ever built. Six engines!', credit: 'An-225 from Flightradar24 3D models', url: 'https://github.com/Flightradar24/fr24-3d-models', license: 'GPLv2' },
];

export const planeById = (id) => PLANES.find((p) => p.id === id);
