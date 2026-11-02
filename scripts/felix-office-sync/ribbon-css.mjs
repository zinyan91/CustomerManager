// Brings the felix-office rules for the shared ribbon controls into office.css, scoped to `.calc-ribbon` so the
// Writer ribbon keeps its own look. Usage: node ribbon-css.mjs <felixRepo> <rev> <office.css> <class...>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [felix, rev, target, ...classes] = process.argv.slice(2);
const show = (sheet) => execFileSync('git', ['-C', felix, 'show', `${rev}:src/styles/${sheet}.css`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');

function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    out.push({ head, body: css.slice(open, j) });
    i = j;
  }
  return out;
}

const wanted = new RegExp(`\\.(${classes.map((c) => c.replace(/-/g, '\\-')).join('|')})(?![\\w-])`);
const scope = (selector) => selector
  .split(',')
  .map((part) => part.trim())
  .map((part) => (part.includes('.calc-ribbon') ? part : part.replace(/^(\.felix-office\s+)?/, '.calc-ribbon ')))
  .map((part) => part.replace('.calc-ribbon .wr-ribbon', '.wr-ribbon.calc-ribbon'))
  .join(',\n');

const picked = [];
for (const sheet of ['office', 'writer', 'calc']) {
  for (const { head, body } of blocks(show(sheet))) {
    if (head.startsWith('@') || !wanted.test(head)) continue;
    if (/(^|,)\s*(:root|\.dark|html|body)\b/.test(head)) continue;
    picked.push(`${scope(head)} ${body}`);
  }
}
const raw = readFileSync(target, 'utf8');
const crlf = raw.includes('\r\n');
const css = `${raw.replace(/\r\n/g, '\n').trimEnd()}\n\n/* ===== ribbon controls: felix-office ${rev}, scoped to .calc-ribbon ===== */\n${picked.join('\n\n')}\n`;
writeFileSync(target, crlf ? css.replace(/\n/g, '\r\n') : css);
console.log(`appended ${picked.length} rules`);
