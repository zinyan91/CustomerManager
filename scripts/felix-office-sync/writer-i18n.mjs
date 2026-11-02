// felix-office keeps Writer's strings in `writer:` of src/i18n/<lang>.ts; CustomerManager keeps them in
// src/office/i18n/writer<Lang>.ts. Usage: node writer-i18n.mjs <felixRepo> <base> <theirs> vi|en
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [felix, BASE, THEIRS, lang] = process.argv.slice(2);
const show = (rev) => execFileSync('git', ['-C', felix, 'show', `${rev}:src/i18n/${lang}.ts`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');

function writerBody(source) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === '  writer: {');
  const end = lines.findIndex((line, i) => i > start && line === '  },');
  if (start < 0 || end < 0) throw new Error(`no writer block in ${lang}.ts`);
  return lines.slice(start + 1, end).map((line) => line.replace(/^ {2}/, '')).join('\n') + '\n';
}

const target = `src/office/i18n/writer${lang === 'vi' ? 'Vi' : 'En'}.ts`;
const raw = readFileSync(target, 'utf8');
const crlf = raw.includes('\r\n');
const ours = raw.replace(/\r\n/g, '\n').split('\n');
const open = ours.findIndex((line) => /^export const writer\w+[^=]*= \{$/.test(line));
const close = ours.lastIndexOf('};');
const dir = mkdtempSync(join(tmpdir(), 'writer-i18n-'));
writeFileSync(join(dir, 'ours'), ours.slice(open + 1, close).join('\n') + '\n');
writeFileSync(join(dir, 'base'), writerBody(show(BASE)));
writeFileSync(join(dir, 'theirs'), writerBody(show(THEIRS)));
let merged, conflicts = 0;
try { merged = execFileSync('git', ['merge-file', '-p', '-L', 'CM', '-L', 'base', '-L', 'felix', join(dir, 'ours'), join(dir, 'base'), join(dir, 'theirs')], { encoding: 'utf8' }); }
catch (e) { merged = e.stdout; conflicts = e.status; }
const out = [...ours.slice(0, open + 1), merged.replace(/\n$/, ''), ...ours.slice(close)].join('\n');
writeFileSync(target, crlf ? out.replace(/\n/g, '\r\n') : out);
console.log(`${target}: ${conflicts} conflict(s)`);
