// Downloads quiz images and writes data/*.json.
// Usage: node tools/fetch-assets.mjs        (Node 18+, needs network)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Airlines (ICAO code -> name); logos from sexym0nk3y/airline-logos ----------
const AIRLINES = [
  ['UAE','Emirates'],['BAW','British Airways'],['QFA','Qantas'],['SIA','Singapore Airlines'],
  ['DLH','Lufthansa'],['AFR','Air France'],['KLM','KLM'],['AAL','American Airlines'],
  ['DAL','Delta Air Lines'],['UAL','United Airlines'],['SWA','Southwest'],['ACA','Air Canada'],
  ['QTR','Qatar Airways'],['ETD','Etihad'],['THY','Turkish Airlines'],['JAL','Japan Airlines'],
  ['ANA','ANA'],['KAL','Korean Air'],['CPA','Cathay Pacific'],['AIC','Air India'],
  ['IGO','IndiGo'],['THA','Thai Airways'],['MAS','Malaysia Airlines'],['GIA','Garuda Indonesia'],
  ['ANZ','Air New Zealand'],['VOZ','Virgin Australia'],['FJI','Fiji Airways'],['ETH','Ethiopian Airlines'],
  ['SAA','South African Airways'],['KQA','Kenya Airways'],['RAM','Royal Air Maroc'],['LAN','LATAM'],
  ['TAM','LATAM Brasil'],['AVA','Avianca'],['CMP','Copa Airlines'],['ARG','Aerolíneas Argentinas'],
  ['GLO','GOL'],['AZU','Azul'],['WJA','WestJet'],['ASA','Alaska Airlines'],
  ['JBU','JetBlue'],['FFT','Frontier'],['VOI','Volaris'],['AMX','Aeroméxico'],
  ['RYR','Ryanair'],['EZY','easyJet'],['VLG','Vueling'],['WZZ','Wizz Air'],
  ['SAS','SAS'],['FIN','Finnair'],['AUA','Austrian'],['SWR','SWISS'],
  ['TAP','TAP Air Portugal'],['AEE','Aegean'],['LOT','LOT Polish Airlines'],['AFL','Aeroflot'],
  ['EIN','Aer Lingus'],['NAX','Norwegian'],['DAH','Air Algérie'],['IBE','Iberia'],
  ['SVA','Saudia'],['MSR','EgyptAir'],['ELY','El Al'],['RJA','Royal Jordanian'],
  ['KAC','Kuwait Airways'],['GFA','Gulf Air'],['AAR','Asiana'],['CCA','Air China'],
  ['CES','China Eastern'],['CSN','China Southern'],['VJC','VietJet Air'],['CEB','Cebu Pacific'],
  ['PAL','Philippine Airlines'],['EVA','EVA Air'],['CAL','China Airlines'],['HVN','Vietnam Airlines'],
  ['AXM','AirAsia'],['JST','Jetstar'],
];

// ---------- Cars: well-known brand names matched against filippofilip95/car-logos-dataset ----------
const CAR_NAMES = [
  'Toyota','Honda','Nissan','Mazda','Subaru','Mitsubishi','Suzuki','Lexus','Infiniti','Acura','Daihatsu','Isuzu',
  'Hyundai','Kia','Genesis','BMW','Mercedes-Benz','Audi','Volkswagen','Porsche','Opel','Smart','Mini','Maybach',
  'Ferrari','Lamborghini','Maserati','Alfa Romeo','Fiat','Lancia','Pagani','Bugatti','Abarth',
  'Peugeot','Renault','Citroën','Citroen','DS','Alpine','Dacia',
  'Rolls-Royce','Bentley','Aston Martin','Jaguar','Land Rover','McLaren','Lotus','MG','Vauxhall','Morgan','Caterham',
  'Volvo','Saab','Koenigsegg','Polestar',
  'Ford','Chevrolet','Cadillac','GMC','Buick','Dodge','Jeep','Chrysler','Ram','Lincoln','Tesla','Rivian','Lucid','Hummer','Pontiac','Shelby',
  'Skoda','Škoda','Seat','Cupra','Tata','Mahindra',
  'BYD','Geely','NIO','Xpeng','Great Wall','Chery','Haval','Hongqi','Zeekr','Lynk & Co','Li Auto','Aiways',
  'Proton','Perodua','Holden','Lada','Rimac','VinFast','Scania','Mack','Peterbilt','Kenworth','Freightliner','Iveco','MAN','DAF',
  'Ssangyong','Spyker','Datsun','Rover','Bristol','Fisker','Vector','Zenvo','W Motors','Apollo','Wiesmann','Gumpert','Noble','Ariel','Ginetta','Radical','BAC','Donkervoort','Mercedes-AMG','Brabus','Alpina','Ruf','Hennessey','Saleen','SSC','Panoz','DeLorean','Studebaker','Packard','Oldsmobile','Plymouth','Mercury','Saturn','Scion','Eagle','Geo',
];

// ---------- Flags: UN members + a few well-known extras ----------
const FLAG_CODES = `af al dz ad ao ag ar am au at az bs bh bd bb by be bz bj bt bo ba bw br bn bg bf bi cv kh cm ca cf td cl cn co km cg cd cr ci hr cu cy cz dk dj dm do ec eg sv gq er ee sz et fj fi fr ga gm ge de gh gr gd gt gn gw gy ht hn hu is in id ir iq ie il it jm jp jo kz ke ki kp kr kw kg la lv lb ls lr ly li lt lu mg mw my mv ml mt mh mr mu mx fm md mc mn me ma mz mm na nr np nl nz ni ne ng mk no om pk pw pa pg py pe ph pl pt qa ro ru rw kn lc vc ws sm st sa sn rs sc sl sg sk si sb so za ss es lk sd sr se ch sy tj tz th tl tg to tt tn tr tm tv ug ua ae gb us uy uz vu ve vn ye zm zw va ps tw hk xk`.split(/\s+/);
const FLAG_NAME_OVERRIDES = { us: 'United States', gb: 'United Kingdom', ru: 'Russia', kr: 'South Korea', kp: 'North Korea', tr: 'Turkey', cd: 'DR Congo', cg: 'Republic of the Congo', ci: 'Ivory Coast', va: 'Vatican City', tw: 'Taiwan', hk: 'Hong Kong', xk: 'Kosovo', ps: 'Palestine', ir: 'Iran', sy: 'Syria', la: 'Laos', vn: 'Vietnam', bo: 'Bolivia', ve: 'Venezuela', tz: 'Tanzania', mm: 'Myanmar', md: 'Moldova', fm: 'Micronesia', mk: 'North Macedonia', cz: 'Czech Republic', bn: 'Brunei', cv: 'Cape Verde', st: 'São Tomé and Príncipe', tl: 'East Timor', sz: 'Eswatini', ae: 'United Arab Emirates', kn: 'Saint Kitts and Nevis', vc: 'Saint Vincent and the Grenadines', lc: 'Saint Lucia' };

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function download(url, dest, { minBytes = 300 } = {}) {
  if (await exists(dest)) return 'cached';
  const res = await fetch(url, { headers: { 'User-Agent': 'trevorplanequiz-fetch' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < minBytes) throw new Error(`too small (${buf.length} B) ${url}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return 'ok';
}

async function pool(items, worker, size = 8) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const idx = i++; results[idx] = await worker(items[idx]); }
  }));
  return results;
}

async function airlines() {
  const out = [];
  const failed = [];
  await pool(AIRLINES, async ([icao, name]) => {
    const rel = `assets/logos/airlines/${icao}.png`;
    try {
      await download(`https://raw.githubusercontent.com/sexym0nk3y/airline-logos/main/logos/${icao}.png`, join(ROOT, rel));
      out.push({ id: icao, name, img: rel });
    } catch (e) { failed.push(`${icao} ${e.message}`); }
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(join(ROOT, 'data/airlines.json'), JSON.stringify(out, null, 1));
  console.log(`airlines: ${out.length} ok, ${failed.length} failed`, failed);
}

async function cars() {
  const res = await fetch('https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/data.json');
  const all = await res.json();
  const byName = new Map(all.map((e) => [e.name.toLowerCase(), e]));
  const bySlug = new Map(all.map((e) => [e.slug.toLowerCase(), e]));
  const chosen = new Map();
  const missing = [];
  for (const n of CAR_NAMES) {
    const key = n.toLowerCase();
    const e = byName.get(key) || bySlug.get(key) || bySlug.get(key.replace(/[^a-z0-9]+/g, '-'));
    if (e) chosen.set(e.slug, e); else missing.push(n);
  }
  const out = [];
  const failed = [];
  await pool([...chosen.values()], async (e) => {
    const rel = `assets/logos/cars/${e.slug}.png`;
    try {
      await download(e.image.optimized, join(ROOT, rel));
      out.push({ id: e.slug, name: e.name, img: rel });
    } catch (err) { failed.push(`${e.slug} ${err.message}`); }
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(join(ROOT, 'data/cars.json'), JSON.stringify(out, null, 1));
  console.log(`cars: ${out.length} ok, ${failed.length} failed`, failed);
  console.log('cars not in dataset:', missing.join(', '));
}

async function flags() {
  const res = await fetch('https://flagcdn.com/en/codes.json');
  const names = await res.json();
  const out = [];
  const failed = [];
  await pool(FLAG_CODES, async (cc) => {
    const rel = `assets/flags/${cc}.png`;
    try {
      await download(`https://flagcdn.com/w320/${cc}.png`, join(ROOT, rel), { minBytes: 60 });
      out.push({ id: cc, name: FLAG_NAME_OVERRIDES[cc] || names[cc] || cc.toUpperCase(), img: rel });
    } catch (e) { failed.push(`${cc} ${e.message}`); }
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(join(ROOT, 'data/flags.json'), JSON.stringify(out, null, 1));
  console.log(`flags: ${out.length} ok, ${failed.length} failed`, failed);
}

await airlines();
await cars();
await flags();
