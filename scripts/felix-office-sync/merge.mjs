// Three-way merge felix-office (BASE -> THEIRS) into CustomerManager src/office.
// Usage (from the repo root): node scripts/felix-office-sync/merge.mjs <felixRepo> <base> <theirs> <pathspec...>
// Writes conflicts as <<<<<<< CM / ======= / >>>>>>> felix; take-side.mjs keeps one side, css.mjs ports calc.css rules.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [felix, BASE, THEIRS, ...scope] = process.argv.slice(2);
const CM = process.cwd();
const work = join(CM, '.tmp/felix-office-sync');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const git = (...args) => execFileSync('git', ['-C', felix, ...args], { encoding: 'buffer', maxBuffer: 1 << 28 });
const show = (rev, path) => { try { return git('show', `${rev}:${path}`); } catch { return null; } };

function mapPath(p) {
  if (p.startsWith('src/calc/') || p.startsWith('src/writer/') || p.startsWith('src/shared/') || p.startsWith('src/i18n/')) return 'src/office/' + p.slice(4);
  if (p.startsWith('tests/fixtures/')) return 'src/office/__tests__/fixtures/' + p.slice('tests/fixtures/'.length);
  if (/^tests\/[^/]+\.test\.tsx?$/.test(p)) return 'src/office/__tests__/' + p.slice('tests/'.length);
  return null;
}
const isTest = p => p.startsWith('tests/') && !p.startsWith('tests/fixtures/');
const isText = p => /\.(ts|tsx|css|json|md)$/.test(p);
function rewriteTest(text) {
  return text
    .replace(/(['"`])\.\.\/src\/(calc|writer|shared|i18n)\//g, '$1../$2/')
    .replace(/(['"`])tests\/fixtures\//g, '$1src/office/__tests__/fixtures/');
}
const lf = b => b.toString('utf8').replace(/\r\n/g, '\n');

const names = git('diff', '--name-status', '--no-renames', BASE, THEIRS, '--', ...scope).toString().trim().split('\n').filter(Boolean);
const report = { written: [], merged: [], conflicts: [], deleted: [], skipped: [], cmOnlyChange: [] };

for (const line of names) {
  const [status, path] = line.split('\t');
  const target = mapPath(path);
  if (!target) { report.skipped.push(`${status} ${path} (no mapping)`); continue; }
  const abs = join(CM, target);
  const ours = existsSync(abs) ? readFileSync(abs) : null;
  if (status === 'D') {
    const base = show(BASE, path);
    if (ours && base && lf(ours) === lf(base)) { rmSync(abs); report.deleted.push(target); }
    else report.cmOnlyChange.push(`D ${target} (CM changed or missing; left as is)`);
    continue;
  }
  let theirs = show(THEIRS, path);
  if (!isText(path)) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, theirs); report.written.push(target); continue; }
  let base = status === 'A' ? null : show(BASE, path);
  let t = lf(theirs), b = base ? lf(base) : null;
  if (isTest(path)) { t = rewriteTest(t); b = b && rewriteTest(b); }
  const crlf = ours && ours.includes('\r\n');
  const out = s => crlf ? s.replace(/\n/g, '\r\n') : s;
  if (!ours) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, t); report.written.push(target); continue; }
  const o = lf(ours);
  if (o === t) continue;
  if (b === null) { report.cmOnlyChange.push(`A ${target} exists in CM already; needs manual merge`); writeFileSync(join(work, target.replace(/\//g, '__') + '.theirs'), t); continue; }
  if (o === b) { writeFileSync(abs, out(t)); report.written.push(target); continue; }
  const slot = join(work, target.replace(/\//g, '__'));
  writeFileSync(slot + '.ours', o); writeFileSync(slot + '.base', b); writeFileSync(slot + '.theirs', t);
  let merged, conflicts = 0;
  try { merged = execFileSync('git', ['merge-file', '-p', '-L', 'CM', '-L', 'base', '-L', 'felix', slot + '.ours', slot + '.base', slot + '.theirs'], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { merged = e.stdout; conflicts = e.status; }
  writeFileSync(abs, out(merged));
  (conflicts ? report.conflicts : report.merged).push(conflicts ? `${target} (${conflicts})` : target);
}
writeFileSync(join(CM, '.tmp/felix-office-sync-report.json'), JSON.stringify(report, null, 2));
for (const [k, v] of Object.entries(report)) console.log(`${k}: ${v.length}`), v.length && k !== 'written' && console.log('  ' + v.join('\n  '));
