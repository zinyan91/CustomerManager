// node take-side.mjs <file> <cm|felix|both>: resolves every conflict block by keeping one side, or both (CM first).
import { readFileSync, writeFileSync } from 'node:fs';
const [file, side] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n');
const out = [];
let state = null;
for (const line of lines) {
  const bare = line.replace(/\r$/, '');
  if (bare === '<<<<<<< CM') { state = 'cm'; continue; }
  if (bare === '=======' && state === 'cm') { state = 'felix'; continue; }
  if (bare === '>>>>>>> felix') { state = null; continue; }
  if (state === null || state === side || side === 'both') out.push(line);
}
writeFileSync(file, out.join('\n'));
