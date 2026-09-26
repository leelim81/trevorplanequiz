// Repairs GLB files whose JSON chunk contains bare NaN / Infinity (invalid JSON that no loader accepts).
// Any accessor left with a non-finite min/max loses both, so viewers recompute bounds from the data.
// Usage: node tools/sanitize-glb.mjs in.glb out.glb   → exits 0 if written, 3 if the file was already clean.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath] = process.argv;
const buf = readFileSync(inPath);
if (buf.readUInt32LE(0) !== 0x46546c67) { console.error('not a GLB'); process.exit(1); }

const jsonLen = buf.readUInt32LE(12);
const jsonText = buf.subarray(20, 20 + jsonLen).toString('utf8');
if (!/\b(NaN|-?Infinity)\b/.test(jsonText)) process.exit(3);

const gltf = JSON.parse(jsonText.replace(/\b-?(NaN|Infinity)\b/g, 'null'));
let fixed = 0;
for (const a of gltf.accessors || []) {
  const bad = (v) => Array.isArray(v) && v.some((n) => typeof n !== 'number' || !Number.isFinite(n));
  if (bad(a.min) || bad(a.max)) { delete a.min; delete a.max; fixed++; }
}

const pad = (b, to, fill) => {
  const rem = b.length % to;
  return rem === 0 ? b : Buffer.concat([b, Buffer.alloc(to - rem, fill)]);
};
const newJson = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 4, 0x20);
const binChunk = buf.subarray(20 + jsonLen);           // header + length + type of the BIN chunk, unchanged
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);                   // 'glTF'
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + newJson.length + binChunk.length, 8);
header.writeUInt32LE(newJson.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);                  // 'JSON'
writeFileSync(outPath, Buffer.concat([header, newJson, binChunk]));
console.error(`sanitised ${inPath}: ${fixed} accessor bounds dropped`);
