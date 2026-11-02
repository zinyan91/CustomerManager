// Brings felix-office calc.css changes (BASE -> THEIRS) into CustomerManager's office.css.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [felix, BASE, THEIRS, target] = process.argv.slice(2);
const show = (rev) => execFileSync('git', ['-C', felix, 'show', `${rev}:src/styles/calc.css`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');

/** Top-level rule blocks: { head, text }. Comments between blocks are dropped. */
function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    out.push({ head: head.replace(/\s+/g, ' '), text: `${head} ${css.slice(open, j)}` });
    i = j;
  }
  return out;
}

const before = new Map(blocks(show(BASE)).map((b) => [b.head, b.text]));
const after = blocks(show(THEIRS));
let css = readFileSync(target, 'utf8');
const crlf = css.includes('\r\n');
css = css.replace(/\r\n/g, '\n');
const ours = new Map(blocks(css).map((b) => [b.head, b.text]));

const added = [], replaced = [], skipped = [];
for (const { head, text } of after) {
  const was = before.get(head);
  if (was === text) continue;
  if (was === undefined) {
    if (ours.has(head)) { skipped.push(`${head} (CM already has it)`); continue; }
    added.push(text);
  } else if (ours.get(head) === was) {
    css = css.replace(was, text);
    replaced.push(head);
  } else skipped.push(`${head} (changed by both)`);
}
if (added.length) css = `${css.trimEnd()}\n\n/* ===== calc.css: felix-office 11/10/2026 ===== */\n${added.join('\n\n')}\n`;
writeFileSync(target, crlf ? css.replace(/\n/g, '\r\n') : css);
console.log(`added ${added.length}, replaced ${replaced.length}: ${replaced.join(' | ')}`);
if (skipped.length) console.log('skipped:\n  ' + skipped.join('\n  '));
