// For felix-office revisions after Writer's strings moved out of src/i18n/<lang>.ts into writer<Lang>.ts (27b2607):
// merges <lang>.ts (without its old `writer:` block) and writer<Lang>.ts into CustomerManager's copies.
// Usage: node i18n-split.mjs <felixRepo> <base> <theirs> vi|en
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [felix, BASE, THEIRS, lang] = process.argv.slice(2);
const Lang = lang === 'vi' ? 'Vi' : 'En';
const show = (rev, path) => {
  try { return execFileSync('git', ['-C', felix, 'show', `${rev}:${path}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n'); } catch { return null; }
};
const lines = (s) => s.split('\n');

/** Splits <lang>.ts into the file without its `writer:` block and that block's body, dedented to the top level. */
function split(source) {
  const all = lines(source);
  const start = all.findIndex((line) => line === '  writer: {');
  if (start < 0) return { rest: source, writer: null };
  const end = all.findIndex((line, i) => i > start && line === '  },');
  return {
    rest: [...all.slice(0, start), ...all.slice(end + 1)].join('\n'),
    writer: all.slice(start + 1, end).map((line) => line.replace(/^ {2}/, '')).join('\n') + '\n',
  };
}
const bodyOf = (source) => {
  const all = lines(source);
  const open = all.findIndex((line) => /^export const \w+[^=]*= \{$/.test(line));
  return { head: all.slice(0, open + 1), body: all.slice(open + 1, all.lastIndexOf('};')).join('\n') + '\n', tail: all.slice(all.lastIndexOf('};')) };
};

function merge3(ours, base, theirs) {
  const dir = mkdtempSync(join(tmpdir(), 'i18n-'));
  writeFileSync(join(dir, 'o'), ours); writeFileSync(join(dir, 'b'), base); writeFileSync(join(dir, 't'), theirs);
  try { return { text: execFileSync('git', ['merge-file', '-p', '-L', 'CM', '-L', 'base', '-L', 'felix', join(dir, 'o'), join(dir, 'b'), join(dir, 't')], { encoding: 'utf8' }), conflicts: 0 }; }
  catch (e) { return { text: e.stdout, conflicts: e.status }; }
}
function write(target, text, crlf) { writeFileSync(target, crlf ? text.replace(/\n/g, '\r\n') : text); }

const base = split(show(BASE, `src/i18n/${lang}.ts`));
const theirsMain = split(show(THEIRS, `src/i18n/${lang}.ts`));
const theirsWriter = show(THEIRS, `src/i18n/writer${Lang}.ts`);

// <lang>.ts
const mainTarget = `src/office/i18n/${lang}.ts`;
const mainRaw = readFileSync(mainTarget, 'utf8');
const main = merge3(mainRaw.replace(/\r\n/g, '\n'), base.rest, theirsMain.rest);
write(mainTarget, main.text, mainRaw.includes('\r\n'));
console.log(`${mainTarget}: ${main.conflicts} conflict(s)`);

// writer<Lang>.ts: only the object body is compared, since the two repos declare it differently.
const writerTarget = `src/office/i18n/writer${Lang}.ts`;
const writerRaw = readFileSync(writerTarget, 'utf8');
const ours = bodyOf(writerRaw.replace(/\r\n/g, '\n'));
const theirs = theirsWriter ? bodyOf(theirsWriter).body : theirsMain.writer;
const writer = merge3(ours.body, base.writer ?? bodyOf(show(BASE, `src/i18n/writer${Lang}.ts`)).body, theirs);
write(writerTarget, [...ours.head, writer.text.replace(/\n$/, ''), ...ours.tail].join('\n'), writerRaw.includes('\r\n'));
console.log(`${writerTarget}: ${writer.conflicts} conflict(s)`);
