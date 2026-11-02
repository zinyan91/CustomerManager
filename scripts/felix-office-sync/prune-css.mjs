// Drops rule blocks after a marker comment in office.css whose selectors name a calc-/wr-/office- class that no
// .ts/.tsx file under src/office mentions. Usage: node prune-css.mjs <office.css> "<marker text>"
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [target, marker] = process.argv.slice(2);
const sources = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && !path.includes('__tests__')) sources.push(readFileSync(path, 'utf8'));
  }
};
walk('src/office');
const code = sources.join('\n');
const used = (name) => new RegExp(`(^|[^a-zA-Z0-9_-])${name.replace(/[-]/g, '\\-')}($|[^a-zA-Z0-9_-])`).test(code);

const raw = readFileSync(target, 'utf8');
const crlf = raw.includes('\r\n');
const css = raw.replace(/\r\n/g, '\n');
const at = css.indexOf(marker);
if (at < 0) throw new Error('marker not found');
const head = css.slice(0, at);
let tail = css.slice(at);

let kept = 0, dropped = 0;
const out = [];
let i = tail.indexOf('\n') + 1;
out.push(tail.slice(0, i));
while (i < tail.length) {
  const open = tail.indexOf('{', i);
  if (open < 0) { out.push(tail.slice(i)); break; }
  let depth = 1, j = open + 1;
  while (j < tail.length && depth > 0) { if (tail[j] === '{') depth++; else if (tail[j] === '}') depth--; j++; }
  const block = tail.slice(i, j);
  const selector = tail.slice(i, open);
  // @media / @keyframes wrappers are kept whole; keyframes are checked by name below.
  const keyframe = /@keyframes\s+([\w-]+)/.exec(selector);
  const names = selector.startsWith('@') ? [] : [...selector.matchAll(/\.((?:calc|wr|office)-[\w-]+)/g)].map((m) => m[1]);
  const dead = keyframe ? !new RegExp(`animation[^;]*\\b${keyframe[1]}\\b`).test(head + tail.replace(block, '')) : names.some((name) => !used(name));
  if (dead) dropped++;
  else { out.push(block); kept++; }
  i = j;
}
tail = out.join('').replace(/\n{3,}/g, '\n\n');
writeFileSync(target, crlf ? (head + tail).replace(/\n/g, '\r\n') : head + tail);
console.log(`kept ${kept}, dropped ${dropped}`);
