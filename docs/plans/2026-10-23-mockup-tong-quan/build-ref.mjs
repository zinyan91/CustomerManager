// Sinh data-ref.js cho mockup từ dữ liệu tra cứu thật trong repo. Chạy: node docs/plans/2026-10-23-mockup-tong-quan/build-ref.mjs
import fs from 'node:fs';
const root = 'D:/CustomerManager';
const out = {};

const cp = fs.readFileSync(`${root}/src/lib/cardPolicyRules.ts`, 'utf8').split(String.fromCharCode(13)).join('');
const body = cp.slice(cp.indexOf('export const CARD_POLICY_RULES'));
out.cardPolicies = [];
for (const block of body.split(/\n  \{\n/).slice(1)) {
  const get = (k) => (block.match(new RegExp(`${k}:\\s*\\n?\\s*'([^']*)'`)) || [])[1];
  const max = (block.match(/\n    maxLimit: ([\d_]+|null)/) || [])[1];
  const cond = [...(block.match(/conditions: \[([\s\S]*?)\]/)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const code = get('code');
  if (!code) continue;
  out.cardPolicies.push({ code, subject: get('subject'), limitRule: get('limitRule'), maxLimit: max && max !== 'null' ? Number(max.replace(/_/g, '')) : null, tiers: /tiers|levels|byTitle/.test(block), conditions: cond.slice(0, 3) });
}

const m = JSON.parse(fs.readFileSync(`${root}/src/data/mdsdv.json`, 'utf8'));
out.mdsdv = { total: m.sectors.length, overdraft: m.overdraftCodes.length, rows: m.sectors.filter((s) => /gỗ|giường|nội thất/i.test(s.n5)).map((s) => ({ c5: s.c5, n5: s.n5, n2: s.n2, n1: s.n1, od: m.overdraftCodes.filter((c) => c.startsWith(s.c5)) })), purposes: m.purposeGroups[0].slice(0, 8) };

const q = JSON.parse(fs.readFileSync(`${root}/src/data/quiz_bank.json`, 'utf8'));
out.quiz = { total: q.length, multi: q.filter((x) => x.correct_answers.length > 1).length, open: q.filter((x) => !x.correct_answers.length).length, sample: q.filter((x) => [2, 78, 1].includes(x.id)) };

const hd = fs.readFileSync(`${root}/supabase/migrations/75_huy_dong_tuan_le_vang_2848.sql`, 'utf8');
out.deposit = { so: '2848-8/2026/TB-BĐH', from: '2026-10-01', to: '2026-10-23', name: 'Tuần lễ vàng huy động KHCN', tiers: [] };
for (const r of hd.matchAll(/\(pid, '([^']+)', '(\w+)', (NULL|'[^']*'), '(\w+)', (\d+), ([\d.]+), \d+\)/g)) {
  out.deposit.tiers.push({ channel: r[2], balance: r[3] === 'NULL' ? null : r[3].slice(1, -1), payout: r[4], tenor: Number(r[5]), rate: Number(r[6]) });
}

const cof = fs.readFileSync(`${root}/supabase/migrations/53_cof_2523_2026_tb_bdh.sql`, 'utf8');
out.cof = { so: '2523/2026/TB-BĐH', from: '2026-08-21', rows: [] };
for (const r of cof.matchAll(/\(pid, 'vnd_thong_thuong', '([^']+)',\s+([\d.]+|NULL),\s+([\d.]+|NULL),\s+([\d.]+|NULL),\s+([\d.]+|NULL),\s+([\d.]+|NULL),\s+([\d.]+|NULL),\s+([\d.]+|NULL)/g)) {
  const n = (v) => (v === 'NULL' ? null : Number(v));
  out.cof.rows.push({ tenor: r[1], fixed: n(r[2]), reset: [n(r[3]), n(r[4]), n(r[5]), n(r[6]), n(r[7]), n(r[8])] });
}

fs.writeFileSync(`${root}/docs/plans/2026-10-23-mockup-tong-quan/data-ref.js`,
  `// Sinh từ src/lib/cardPolicyRules.ts, src/data/mdsdv.json, src/data/quiz_bank.json và migration 53, 75. Không sửa tay.\nwindow.REF = ${JSON.stringify(out, null, 1)};\n`);
console.log(out.cardPolicies.length, out.mdsdv.rows.length, out.deposit.tiers.length, out.cof.rows.length, out.quiz.sample.length);
