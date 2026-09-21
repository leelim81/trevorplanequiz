export const CATEGORIES = {
  airlines: { label: 'Airlines', icon: '✈️', file: 'data/airlines.json', prefix: 'air' },
  cars: { label: 'Cars', icon: '🚗', file: 'data/cars.json', prefix: 'car' },
  flags: { label: 'Flags', icon: '🚩', file: 'data/flags.json', prefix: 'flag' },
};
export const bank = { airlines: [], cars: [], flags: [] };

export async function loadQuestionBank() {
  await Promise.all(Object.entries(CATEGORIES).map(async ([cat, c]) => {
    const res = await fetch(c.file);
    const arr = await res.json();
    bank[cat] = arr.map((it) => ({ id: `${c.prefix}:${it.id}`, cat, label: it.name, img: it.img }));
  }));
}

export function questionsFor(category) {
  return category === 'mixed' ? [...bank.airlines, ...bank.cars, ...bank.flags] : bank[category] || [];
}
export function categoryLabel(category) {
  return category === 'mixed' ? '🎲 Mixed' : `${CATEGORIES[category].icon} ${CATEGORIES[category].label}`;
}
