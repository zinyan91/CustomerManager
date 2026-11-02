// Brings office.css's rules for the shared ribbon controls level with felix-office <rev>: a block with the same
// selector gets felix's body everywhere it appears, a missing block is appended as is. Theme colours replace the
// Fluent hex values. Usage: node sync-ribbon-css.mjs <felixRepo> <rev> <office.css> <class...>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [felix, rev, target, ...classes] = process.argv.slice(2);
const show = (sheet) => execFileSync('git', ['-C', felix, 'show', `${rev}:src/styles/${sheet}.css`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
const COLOURS = {
  '#d2d0ce': 'var(--border-strong)', '#c8c6c4': 'var(--border-strong)', '#edebe9': 'var(--border-subtle)', '#e1dfdd': 'var(--border-subtle)',
  '#185abd': 'var(--fl-accent)', '#107c41': 'var(--fl-accent)', '#0078d4': 'var(--fl-accent)', '#e6f4ea': 'var(--fl-accent-tint)',
  '#605e5c': 'var(--text-secondary)', '#a19f9d': 'var(--text-muted)', '#201f1e': 'var(--text-primary)', '#323130': 'var(--text-primary)',
  '#ffffff': 'var(--bg-surface)', '#fff': 'var(--bg-surface)', '#f3f2f1': 'var(--bg-surface-hover)', '#faf9f8': 'var(--bg-surface-hover)',
};
const themed = (text) => text.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (hex) => COLOURS[hex.toLowerCase()] ?? hex);

function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    out.push({ start: i + css.slice(i, open).search(/\S/), open, end: j, head, key: head.replace(/\s+/g, ' '), body: css.slice(open, j) });
    i = j;
  }
  return out;
}

const wanted = new RegExp(`\\.(${classes.map((c) => c.replace(/-/g, '\\-')).join('|')})(?![\\w-])`);
const raw = readFileSync(target, 'utf8');
const crlf = raw.includes('\r\n');
let css = raw.replace(/\r\n/g, '\n');
const scoped = css.indexOf('/* ===== ribbon controls: felix-office');
if (scoped >= 0) css = css.slice(0, scoped).trimEnd() + '\n';

const latest = new Map();
for (const sheet of ['office', 'writer', 'calc']) {
  for (const b of blocks(show(sheet))) {
    if (b.head.startsWith('@') || !wanted.test(b.head) || /(:root|\.dark\b|data-theme|(^|[\s,>~+])(html|body)\b)/.test(b.head)) continue;
    latest.set(b.key, { head: b.head, body: themed(b.body) });
  }
}

let replaced = 0;
const present = new Set();
const ours = blocks(css).filter((b) => !b.head.startsWith('@'));
for (const b of [...ours].reverse()) {
  const next = latest.get(b.key);
  if (!next) continue;
  present.add(b.key);
  if (b.body !== next.body) {
    css = css.slice(0, b.open) + next.body + css.slice(b.end);
    replaced++;
  }
}
const missing = [...latest].filter(([key]) => !present.has(key)).map(([, b]) => `${b.head} ${b.body}`);
if (missing.length) css = `${css.trimEnd()}\n\n/* ===== ribbon controls: felix-office ${rev} ===== */\n${missing.join('\n\n')}\n`;
writeFileSync(target, crlf ? css.replace(/\n/g, '\r\n') : css);
console.log(`replaced ${replaced}, appended ${missing.length}`);
