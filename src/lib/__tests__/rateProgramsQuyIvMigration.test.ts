// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildDepositRateRows, type RateProgramTier } from '../rateQuote';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SCHEMA = ['09_rate_programs', '10_rate_program_tdh_verified', '15_rate_program_scope'].map((name) => read(`supabase/migrations/${name}.sql`));
const M78 = read('supabase/migrations/78_huy_dong_tuan_le_vang_3210.sql');
const M79 = read('supabase/migrations/79_lscv_khcn_quy_iv_3177.sql');

let db: PGlite;

async function programId(doc: string): Promise<number> {
  const r = await db.query<{ Id: number }>('SELECT "Id" FROM public."RatePrograms" WHERE "DocumentNumber" = $1', [doc]);
  expect(r.rows).toHaveLength(1);
  return r.rows[0].Id;
}

async function count(table: string, pid: number): Promise<number> {
  const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public."${table}" WHERE "ProgramId" = $1`, [pid]);
  return r.rows[0].n;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
  `);
  for (const sql of SCHEMA) await db.exec(sql);
  // Chạy hai lần: lần sau phải bỏ qua, không nhân đôi dòng.
  for (let i = 0; i < 2; i += 1) {
    await db.exec(M78);
    await db.exec(M79);
  }
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('migration 78 — huy động 3210/2026/TB-TGĐ', () => {
  it('đủ 119 dòng: 75 quầy, 20 phong tỏa CASA, 4 online, 20 VOF', async () => {
    const pid = await programId('3210/2026/TB-TGĐ');
    expect(await count('RateProgramTiers', pid)).toBe(119);
    const r = await db.query<{ Channel: string; casa: boolean; n: number }>(
      `SELECT "Channel", coalesce("BalanceTierLabel", '') LIKE 'Tiết kiệm phong tỏa CASA%' AS casa, count(*)::int AS n
         FROM public."RateProgramTiers" WHERE "ProgramId" = $1 GROUP BY 1, 2 ORDER BY 1, 2`,
      [pid],
    );
    expect(r.rows).toEqual([
      { Channel: 'ftp', casa: false, n: 16 },
      { Channel: 'ftp', casa: true, n: 4 },
      { Channel: 'online', casa: false, n: 4 },
      { Channel: 'quay', casa: false, n: 75 },
      { Channel: 'quay', casa: true, n: 20 },
    ]);
  });

  it('hiệu lực 01/11 → 15/11/2026 và số liệu khớp văn bản ở vài ô mẫu', async () => {
    const pid = await programId('3210/2026/TB-TGĐ');
    const p = await db.query<{ EffectiveFrom: Date; EffectiveTo: Date; SourceVerified: boolean }>(
      'SELECT "EffectiveFrom", "EffectiveTo", "SourceVerified" FROM public."RatePrograms" WHERE "Id" = $1', [pid]);
    expect(p.rows[0].SourceVerified).toBe(true);
    const rate = async (label: string, band: string | null, mode: string, tenor: number) => {
      const r = await db.query<{ RateAnnual: string }>(
        `SELECT "RateAnnual" FROM public."RateProgramTiers"
          WHERE "ProgramId" = $1 AND "Label" = $2 AND "BalanceTierLabel" IS NOT DISTINCT FROM $3 AND "PayoutMode" = $4 AND "TenorMonths" = $5`,
        [pid, label, band, mode, tenor]);
      expect(r.rows).toHaveLength(1);
      return Number(r.rows[0].RateAnnual);
    };
    expect(await rate('Quầy — 06 tháng — lãi cuối kỳ', 'Quy mô KH ≥ 5 tỷ đồng', 'cuoi_ky', 6)).toBe(0.092);
    expect(await rate('Quầy — 12 tháng — lãi trả trước', 'Quy mô KH < 100 triệu đồng', 'tra_truoc', 12)).toBe(0.0783);
    expect(await rate('FTP mua (VOF) — 09 tháng — lãi hàng quý', null, 'hang_quy', 9)).toBe(0.089);
    expect(await rate('Phong tỏa CASA — 09 tháng — lãi trả trước', 'Tiết kiệm phong tỏa CASA · 1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 9)).toBe(0.0867);
  });

  it('dòng phong tỏa CASA không gộp vào dòng lãi trả trước của Tuần lễ vàng trên màn chào', async () => {
    const pid = await programId('3210/2026/TB-TGĐ');
    const r = await db.query<RateProgramTier>('SELECT * FROM public."RateProgramTiers" WHERE "ProgramId" = $1', [pid]);
    const rows = buildDepositRateRows(r.rows.map((t) => ({ ...t, RateAnnual: Number(t.RateAnnual) })));
    // 75 quầy + 20 phong tỏa ghép với online/FTP theo khóa bậc|kỳ hạn|cách lãnh lãi.
    const casa = rows.filter((row) => row.balanceTierLabel.startsWith('Tiết kiệm phong tỏa CASA ·'));
    expect(casa).toHaveLength(20);
    expect(casa.every((row) => row.byChannel.quay !== undefined && row.byChannel.online === undefined)).toBe(true);
  });
});

describe('migration 79 — LSCV KHCN quý IV, 3177/2026/TB-TGĐ', () => {
  it('ngắn hạn: 4 lựa chọn cố định suốt thời gian vay, miễn phí trả trước hạn, 4 Rate ID', async () => {
    const pid = await programId('3177/2026/TB-TGĐ (ngắn hạn)');
    const tiers = await db.query<{ PackageCode: string; RateAnnual: string; MinFeeRatio: string }>(
      'SELECT "PackageCode", "RateAnnual", "MinFeeRatio" FROM public."RateProgramTiers" WHERE "ProgramId" = $1 ORDER BY "SortOrder"', [pid]);
    expect(tiers.rows.map((t) => [t.PackageCode, Number(t.RateAnnual)])).toEqual([['LC1', 0.099], ['LC2', 0.106], ['LC3', 0.109], ['LC4', 0.118]]);
    expect(tiers.rows.every((t) => Number(t.MinFeeRatio) === 0.02)).toBe(true);
    expect(await count('RateProgramFbeCodes', pid)).toBe(4);
    expect(await count('RateProgramPrepaymentFees', pid)).toBe(1);
    expect(await count('RateProgramConditions', pid)).toBe(2);
  });

  it('trung dài hạn: LC1 11,9% 6 tháng, LC2 12,2% 12 tháng, sau đó LSCS + 3,75% điều chỉnh 3 tháng', async () => {
    const pid = await programId('3177/2026/TB-TGĐ (trung dài hạn)');
    const p = await db.query<{ FloatingSpreadAnnual: string; RateResetMonths: number }>(
      'SELECT "FloatingSpreadAnnual", "RateResetMonths" FROM public."RatePrograms" WHERE "Id" = $1', [pid]);
    expect(Number(p.rows[0].FloatingSpreadAnnual)).toBe(0.0375);
    expect(p.rows[0].RateResetMonths).toBe(3);
    const tiers = await db.query<{ FixedMonths: number; RateAnnual: string }>(
      'SELECT "FixedMonths", "RateAnnual" FROM public."RateProgramTiers" WHERE "ProgramId" = $1 ORDER BY "SortOrder"', [pid]);
    expect(tiers.rows.map((t) => [t.FixedMonths, Number(t.RateAnnual)])).toEqual([[6, 0.119], [12, 0.122]]);
    const fees = await db.query<{ YearFrom: number; YearTo: number | null; FeeRatio: string }>(
      'SELECT "YearFrom", "YearTo", "FeeRatio" FROM public."RateProgramPrepaymentFees" WHERE "ProgramId" = $1 ORDER BY "YearFrom"', [pid]);
    expect(fees.rows.map((f) => [f.YearFrom, f.YearTo, Number(f.FeeRatio)])).toEqual([[1, 1, 0.03], [2, 2, 0.02], [3, 4, 0.01], [5, 5, 0.005], [6, null, 0]]);
    expect(await count('RateProgramFbeCodes', pid)).toBe(4);
  });
});
