// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M76 = read('supabase/migrations/76_huy_dong_cam_co.sql');
const M77 = read('supabase/migrations/77_chuyen_cam_co_cu.sql');
const R77 = read('supabase/rollbacks/77_chuyen_cam_co_cu_rollback.sql');

const CAM_CO = 'Cầm cố sổ tiết kiệm';

async function buildDb(extra = ''): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.can_access_customer(cid bigint) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
    CREATE TABLE public."Customers" ("Id" integer PRIMARY KEY, "FullName" text);
    CREATE TABLE public."CreditContracts" (
      "Id" serial PRIMARY KEY, "CustomerId" integer, "HdtdNumber" text, "LoanMethod" text,
      "ContractAmount" numeric, "ContractStartDate" date, "ContractEndDate" date,
      "InterestRate" numeric, "NormalRate" numeric, "CollateralIds" text, "IsClosed" boolean DEFAULT false);
    CREATE TABLE public."LoanContracts" (
      "Id" serial PRIMARY KEY, "CustomerId" integer, "CreditContractId" integer, "CollateralId" integer, "CollateralIds" text,
      "ContractNumber" text, "LoanMethod" text, "ContractAmount" numeric, "LoanAmount" numeric, "CurrentBalance" numeric,
      "DisbursementDate" text, "ContractStartDate" text, "ContractEndDate" text, "KunnDueDate" text,
      "InterestRate" numeric, "NormalRate" numeric, "IsSettled" boolean DEFAULT false, "SettledDate" date);
    CREATE TABLE public."Collaterals" ("Id" serial PRIMARY KEY, "CustomerId" integer, "AssetCode" text, "AssetType" text, "Value" numeric, "AppraisedValue" numeric, "Note" text);
    CREATE TABLE public."MortgageContractCollaterals" ("MortgageContractId" integer, "CollateralId" integer);
    CREATE TABLE public."RepaymentSchedules" ("Id" serial PRIMARY KEY, "ContractId" integer, "PrincipalAmount" numeric,
      "ActualPaidPrincipal" numeric, "PrepaidPrincipalAmount" numeric, "IsPaid" boolean);

    INSERT INTO public."Customers" VALUES (1, 'An'), (2, 'Bình');
    INSERT INTO public."Collaterals" ("Id", "CustomerId", "AssetCode", "AssetType", "Value", "AppraisedValue") VALUES
      (11, 1, 'STK-1', 'Tiền gửi / STK', 500000000, NULL), (12, 1, 'STK-2', 'Sổ tiết kiệm', 300000000, NULL),
      (13, 1, NULL, 'STK khác', NULL, 200000000), (14, 2, 'SO-DO-1', 'Bất động sản đất ở', 3000000000, NULL),
      (15, 1, 'STK-OLD', 'Tiền gửi / STK', 150000000, NULL), (16, 1, 'SO-DO-AN', 'Bất động sản đất ở', 2000000000, NULL);
    INSERT INTO public."CreditContracts" ("Id", "CustomerId", "HdtdNumber", "LoanMethod", "ContractAmount", "ContractStartDate", "ContractEndDate", "InterestRate", "CollateralIds") VALUES
      (1, 1, 'HDTD-CC-1', '${CAM_CO}', 900000000, '2026-01-01', '2027-12-31', 6.5, '11'),
      (2, 2, 'HDTD-VAY-2', 'Cho vay từng lần', 2000000000, '2026-01-01', '2036-01-01', 9, '14');
    INSERT INTO public."LoanContracts" ("Id", "CustomerId", "CreditContractId", "CollateralId", "CollateralIds", "ContractNumber", "LoanMethod",
      "LoanAmount", "CurrentBalance", "DisbursementDate", "KunnDueDate", "ContractEndDate", "InterestRate", "IsSettled", "SettledDate") VALUES
      (101, 1, 1, 11, NULL, 'KUNN-1', NULL, 400000000, 400000000, '2026-06-20', '2027-02-15', NULL, 0.065, false, NULL),
      (102, 1, 1, NULL, '12, 13', 'KUNN-2', '${CAM_CO}', 350000000, 350000000, '2026-09-07', NULL, '2027-02-02', 6.2, false, NULL),
      (104, 1, 1, 15, NULL, 'KUNN-4', NULL, 120000000, 0, '2026-01-12', '2026-05-03', NULL, 6.4, true, '2026-04-20'),
      (103, 2, 2, 14, NULL, 'KUNN-3', 'Cho vay từng lần', 2000000000, 1900000000, '2026-02-01', '2036-02-01', NULL, 9, false, NULL);
    INSERT INTO public."RepaymentSchedules" ("ContractId", "PrincipalAmount", "IsPaid") VALUES (102, 50000000, true), (102, 300000000, false);
    ${extra}
  `);
  await db.exec(M76);
  return db;
}

const rows = async <T,>(db: PGlite, sql: string) => (await db.query<T>(sql)).rows;
const num = (v: unknown) => Number(v);

async function snapshot(db: PGlite) {
  return {
    loans: await rows<{ ContractNumber: string; Amount: string; InterestRate: string; DisbursementDate: string; DueDate: string; IsClosed: boolean; ClosedHow: string | null }>(db,
      `SELECT "ContractNumber", "Amount", "InterestRate", "DisbursementDate"::text AS "DisbursementDate", "DueDate"::text AS "DueDate", "IsClosed", "ClosedHow"
       FROM "PledgeLoans" ORDER BY "ContractNumber"`),
    books: await rows<{ BookNumber: string; Amount: string; MovedFromCollateralId: number }>(db,
      `SELECT "BookNumber", "Amount", "MovedFromCollateralId" FROM "SavingsBooks" ORDER BY "BookNumber"`),
    links: await rows<{ c: string; b: string; p: string; released: string | null; note: string | null }>(db,
      `SELECT l."ContractNumber" AS c, b."BookNumber" AS b, k."PrincipalCovered" AS p, k."ReleasedDate"::text AS released, k."Note" AS note
       FROM "PledgeLoanSavingsBooks" k JOIN "PledgeLoans" l ON l."Id" = k."PledgeLoanId" JOIN "SavingsBooks" b ON b."Id" = k."SavingsBookId"
       ORDER BY 1, 2`),
    repayments: await rows<{ c: string; kind: string; p: string; d: string }>(db,
      `SELECT l."ContractNumber" AS c, r."Kind" AS kind, r."PrincipalPaid" AS p, r."RepaymentDate"::text AS d FROM "PledgeLoanRepayments" r JOIN "PledgeLoans" l ON l."Id" = r."PledgeLoanId" ORDER BY 1`),
  };
}

describe('migration 77: chuyển khoản cầm cố STK cũ sang tab mới', { timeout: 30000 }, () => {
  it('chuyen KUNN cam co, so, lien ket va goc da thu; khong dung khoan vay thuong', async () => {
    const db = await buildDb();
    await db.exec(M77);
    const s = await snapshot(db);

    expect(s.loans.map((l) => [l.ContractNumber, num(l.Amount), num(l.InterestRate), l.DisbursementDate, l.DueDate, l.IsClosed, l.ClosedHow])).toEqual([
      ['KUNN-1', 400000000, 6.5, '2026-06-20', '2027-02-15', false, null],
      ['KUNN-2', 350000000, 6.2, '2026-09-07', '2027-02-02', false, null],
      ['KUNN-4', 120000000, 6.4, '2026-01-12', '2026-05-03', true, 'full'],
    ]);
    expect(s.books.map((b) => [b.BookNumber, num(b.Amount), num(b.MovedFromCollateralId)])).toEqual([
      ['STK-1', 500000000, 11], ['STK-2', 300000000, 12], ['STK-OLD', 150000000, 15], ['TSBD-13', 200000000, 13],
    ]);
    expect(s.links.map((l) => [l.c, l.b, num(l.p), l.released])).toEqual([
      ['KUNN-1', 'STK-1', 400000000, null],
      ['KUNN-2', 'STK-2', 210000000, null],
      ['KUNN-2', 'TSBD-13', 140000000, null],
      ['KUNN-4', 'STK-OLD', 120000000, '2026-04-20'],
    ]);
    expect(s.links.filter((l) => l.c === 'KUNN-2').every((l) => l.note === 'Chia tự động khi chuyển, cần kiểm lại')).toBe(true);
    expect(s.repayments.map((r) => [r.c, r.kind, num(r.p), r.d])).toEqual([
      ['KUNN-2', 'partial', 50000000, '2026-09-07'],
      ['KUNN-4', 'full', 120000000, '2026-04-20'],
    ]);

    const marks = await rows<{ t: string; id: number; moved: number | null }>(db, `
      SELECT 'cc' AS t, "Id" AS id, "MovedToPledgeLoanId" AS moved FROM "CreditContracts"
      UNION ALL SELECT 'lc', "Id", "MovedToPledgeLoanId" FROM "LoanContracts"
      UNION ALL SELECT 'col', "Id", "MovedToSavingsBookId" FROM "Collaterals" ORDER BY 1, 2`);
    expect(marks.filter((m) => m.moved !== null).map((m) => `${m.t}${m.id}`)).toEqual(['cc1', 'col11', 'col12', 'col13', 'col15', 'lc101', 'lc102', 'lc104']);
  });

  it('chay lai lan hai khong tao ban ghi trung', async () => {
    const db = await buildDb();
    await db.exec(M77);
    const first = await snapshot(db);
    await db.exec(M77);
    expect(await snapshot(db)).toEqual(first);
  });

  it('rollback tra ve trang thai ban dau', async () => {
    const db = await buildDb();
    await db.exec(M77);
    await db.exec(R77);
    const s = await snapshot(db);
    expect([s.loans.length, s.books.length, s.links.length, s.repayments.length]).toEqual([0, 0, 0, 0]);
    const marked = await rows(db, `SELECT 1 FROM "LoanContracts" WHERE "MovedToPledgeLoanId" IS NOT NULL
      UNION ALL SELECT 1 FROM "CreditContracts" WHERE "MovedToPledgeLoanId" IS NOT NULL
      UNION ALL SELECT 1 FROM "Collaterals" WHERE "MovedToSavingsBookId" IS NOT NULL`);
    expect(marked).toHaveLength(0);
  });

  it('KUNN thieu ngay den han thi bao loi va khong ghi gi', async () => {
    const db = await buildDb(`UPDATE public."LoanContracts" SET "KunnDueDate" = NULL, "ContractEndDate" = NULL WHERE "Id" = 101;`);
    await expect(db.exec(M77)).rejects.toThrow(/KUNN-1/);
    const s = await snapshot(db);
    expect(s.loans).toHaveLength(0);
  });

  it('TSBD khong phai so tiet kiem thi bao loi va khong ghi gi', async () => {
    const db = await buildDb(`UPDATE public."LoanContracts" SET "CollateralIds" = '16' WHERE "Id" = 101;`);
    await expect(db.exec(M77)).rejects.toThrow(/Id 16 .*không phải sổ tiết kiệm/);
    expect((await snapshot(db)).books).toHaveLength(0);
  });

  it('KUNN dang vay khong con so bao dam nao thi bao loi', async () => {
    const db = await buildDb(`UPDATE public."LoanContracts" SET "CollateralId" = 99 WHERE "Id" = 101; UPDATE public."CreditContracts" SET "CollateralIds" = NULL WHERE "Id" = 1;`);
    await expect(db.exec(M77)).rejects.toThrow(/không có sổ tiết kiệm bảo đảm.*KUNN-1/);
    expect((await snapshot(db)).loans).toHaveLength(0);
  });

  it('so nam trong hop dong the chap thi bao loi', async () => {
    const db = await buildDb(`INSERT INTO public."MortgageContractCollaterals" VALUES (7, 12);`);
    await expect(db.exec(M77)).rejects.toThrow(/12/);
    expect((await snapshot(db)).books).toHaveLength(0);
  });

  it('rollback tu choi khi da co tra no ghi sau khi chuyen', async () => {
    const db = await buildDb();
    await db.exec(M77);
    await db.exec(`INSERT INTO "PledgeLoanRepayments" ("PledgeLoanId", "RepaymentDate", "Kind", "PrincipalPaid")
      SELECT "Id", '2026-11-01', 'partial', 1000000 FROM "PledgeLoans" WHERE "ContractNumber" = 'KUNN-1'`);
    await expect(db.exec(R77)).rejects.toThrow(/KUNN-1/);
    await db.exec('ROLLBACK').catch(() => undefined);
    expect((await snapshot(db)).loans).toHaveLength(3);
  });

  it('TSBD dung chung voi khoan vay thuong thi bao loi va khong ghi gi', async () => {
    const db = await buildDb(`UPDATE public."CreditContracts" SET "CollateralIds" = '14, 12' WHERE "Id" = 2;`);
    await expect(db.exec(M77)).rejects.toThrow(/12/);
    expect((await snapshot(db)).books).toHaveLength(0);
  });
});
