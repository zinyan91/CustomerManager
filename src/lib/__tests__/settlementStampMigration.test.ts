import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const one = async <T,>(sql: string) => (await db.query<T>(sql)).rows[0];

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE TABLE public."CreditContracts" ("Id" int PRIMARY KEY, "HdtdNumber" text, "IsClosed" boolean DEFAULT false, "ClosedDate" date);
    CREATE TABLE public."LoanContracts" ("Id" int PRIMARY KEY, "CreditContractId" int, "IsSettled" boolean DEFAULT false, "SettledDate" date, "CurrentBalance" numeric);
    CREATE TABLE public."RepaymentSchedules" ("Id" int PRIMARY KEY, "ContractId" int, "IsPaid" boolean DEFAULT false, "PaymentDate" date);
    -- Dữ liệu cũ: KUNN 1 đã tất toán bằng ô tick (không ngày, còn treo số dư), HĐTD 10 đã đóng không ngày
    INSERT INTO public."CreditContracts" VALUES (10, 'HD-10', true, NULL), (20, 'HD-20', false, NULL);
    INSERT INTO public."LoanContracts" VALUES (1, 10, true, NULL, 1500000000), (2, 20, false, NULL, 800000000), (3, 20, true, '2026-10-21', 0);
    INSERT INTO public."RepaymentSchedules" VALUES (100, 1, true, '2026-10-21'), (101, 1, true, '2026-09-21'), (200, 2, false, NULL);
  `);
  await db.exec(readFileSync('supabase/migrations/81_ngay_tat_toan_va_thoi_diem_ghi.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });

describe.sequential('migration 81: ngày tất toán và thời điểm ghi', () => {
  it('dữ liệu cũ: điền ngày tất toán theo ngày thu cuối, ngày đóng HĐTD theo KUNN, dư nợ KUNN đã tất toán về 0; không đặt thời điểm ghi giả', async () => {
    expect(await one(`SELECT "SettledDate"::text AS d, "SettledAt" AS at, "CurrentBalance"::text AS b FROM public."LoanContracts" WHERE "Id" = 1`))
      .toEqual({ d: '2026-10-21', at: null, b: '0' });
    expect(await one(`SELECT "CurrentBalance"::text AS b FROM public."LoanContracts" WHERE "Id" = 2`)).toEqual({ b: '800000000' });
    expect(await one(`SELECT "ClosedDate"::text AS d, "ClosedAt" AS at FROM public."CreditContracts" WHERE "Id" = 10`))
      .toEqual({ d: '2026-10-21', at: null });
    expect(await one(`SELECT "SettledDate"::text AS d FROM public."LoanContracts" WHERE "Id" = 3`)).toEqual({ d: '2026-10-21' });
  });

  it('sao lưu trạng thái trước khi điền, giữ được số dư cũ', async () => {
    expect(await one(`SELECT "SettledDate", "CurrentBalance"::text AS b FROM public."LoanContracts_backup_20261110" WHERE "Id" = 1`))
      .toEqual({ SettledDate: null, b: '1500000000' });
  });

  it('tick tất toán (không kèm ngày): tự ghi thời điểm, ngày hôm nay, đưa dư nợ về 0', async () => {
    await db.exec(`UPDATE public."LoanContracts" SET "IsSettled" = true WHERE "Id" = 2`);
    const r = await one<{ d: string; has_at: boolean; b: string }>(`SELECT "SettledDate"::text AS d, "SettledAt" IS NOT NULL AS has_at, "CurrentBalance"::text AS b FROM public."LoanContracts" WHERE "Id" = 2`);
    expect(r.has_at).toBe(true);
    expect(r.b).toBe('0');
    expect(r.d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('tất toán có ghi ngày nghiệp vụ lùi về trước: giữ ngày đó, vẫn đóng dấu thời điểm bấm', async () => {
    await db.exec(`UPDATE public."LoanContracts" SET "IsSettled" = false WHERE "Id" = 2`);
    expect(await one(`SELECT "SettledDate", "SettledAt" FROM public."LoanContracts" WHERE "Id" = 2`)).toEqual({ SettledDate: null, SettledAt: null });
    await db.exec(`UPDATE public."LoanContracts" SET "IsSettled" = true, "SettledDate" = '2026-11-05' WHERE "Id" = 2`);
    expect(await one(`SELECT "SettledDate"::text AS d, "SettledAt" IS NOT NULL AS has_at FROM public."LoanContracts" WHERE "Id" = 2`))
      .toEqual({ d: '2026-11-05', has_at: true });
  });

  it('đóng HĐTD tự ghi ngày và thời điểm; mở lại thì xoá', async () => {
    await db.exec(`UPDATE public."CreditContracts" SET "IsClosed" = true WHERE "Id" = 20`);
    expect(await one(`SELECT "ClosedDate" IS NOT NULL AS d, "ClosedAt" IS NOT NULL AS at FROM public."CreditContracts" WHERE "Id" = 20`)).toEqual({ d: true, at: true });
    await db.exec(`UPDATE public."CreditContracts" SET "IsClosed" = false WHERE "Id" = 20`);
    expect(await one(`SELECT "ClosedDate", "ClosedAt" FROM public."CreditContracts" WHERE "Id" = 20`)).toEqual({ ClosedDate: null, ClosedAt: null });
  });

  it('thu một kỳ ghi thời điểm bấm, kể cả khi ngày thu là ngày đến hạn trong quá khứ', async () => {
    await db.exec(`UPDATE public."RepaymentSchedules" SET "IsPaid" = true, "PaymentDate" = '2026-10-08' WHERE "Id" = 200`);
    expect(await one(`SELECT "PaymentDate"::text AS d, "PaidRecordedAt" IS NOT NULL AS at FROM public."RepaymentSchedules" WHERE "Id" = 200`))
      .toEqual({ d: '2026-10-08', at: true });
  });

  it('bảng sao lưu không mở cho người dùng', async () => {
    await db.exec('SET ROLE authenticated');
    try {
      await expect(db.query(`SELECT 1 FROM public."LoanContracts_backup_20261110"`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('RESET ROLE');
    }
  });
});
