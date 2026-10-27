// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MIGRATION = read('supabase/migrations/76_huy_dong_cam_co.sql');
const ROLLBACK = read('supabase/rollbacks/76_huy_dong_cam_co_rollback.sql');

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  alice: '00000000-0000-0000-0000-00000000000a',
  carol: '00000000-0000-0000-0000-00000000000c',
};

async function buildDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    -- Supabase từ 30/10/2026: bảng mới trong public KHÔNG tự được cấp quyền cho anon/authenticated.
    CREATE ROLE service_role NOLOGIN;

    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id), "Role" text NOT NULL);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" IN ('master_admin', 'user_admin')) $$;
    CREATE TABLE public."Customers" ("Id" integer PRIMARY KEY, "OwnerId" uuid, "FullName" text);
    CREATE FUNCTION public.can_access_customer(cid bigint) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public."Customers" c WHERE c."Id" = cid AND c."OwnerId" = auth.uid()) $$;
    CREATE TABLE public."CreditContracts" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."LoanContracts" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."Collaterals" ("Id" serial PRIMARY KEY, "CustomerId" integer);

    INSERT INTO auth.users (id) VALUES ${Object.values(ID).map((i) => `('${i}')`).join(', ')};
    INSERT INTO public."UserRoles" VALUES ('${ID.master}', 'master_admin'), ('${ID.alice}', 'user'), ('${ID.carol}', 'user');
    INSERT INTO public."Customers" VALUES (1, '${ID.alice}', 'An'), (2, '${ID.alice}', 'Bình'), (3, '${ID.carol}', 'Chi');
    -- Bảng có sẵn giữ quyền cũ; chỉ bảng tạo mới mất quyền tự động.
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  `);
  await db.exec(MIGRATION);
  return db;
}

async function actAs(db: PGlite, who: 'anon' | keyof typeof ID) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(`SET ROLE ${who === 'anon' ? 'anon' : 'authenticated'}`);
}

async function addBook(db: PGlite, customerId: number, bookNumber: string, amount = 500000000): Promise<number> {
  const r = await db.query<{ Id: number }>(
    `INSERT INTO public."SavingsBooks" ("CustomerId", "BookNumber", "DepositType", "Currency", "Amount", "InterestRate",
       "OpenDate", "Tenor", "TenorUnit", "MaturityDate", "InterestPaymentMethod")
     VALUES ($1, $2, 'tg_vnd', 'VND', $3, 5.2, '2026-04-15', 12, 'thang', '2027-04-15', 'end_term') RETURNING "Id"`,
    [customerId, bookNumber, amount]
  );
  return Number(r.rows[0].Id);
}

async function saveLoan(db: PGlite, loan: Record<string, unknown>, links: Array<{ SavingsBookId: number; PrincipalCovered: number }>): Promise<number> {
  const r = await db.query<{ id: number }>(`SELECT public.save_pledge_loan($1::jsonb, $2::jsonb) AS id`, [JSON.stringify(loan), JSON.stringify(links)]);
  return Number(r.rows[0].id);
}

async function repay(db: PGlite, loanId: number, rep: Record<string, unknown>, closingInterest: number | null = null): Promise<number> {
  const r = await db.query<{ id: number }>(`SELECT public.record_pledge_repayment($1, $2::jsonb, $3) AS id`, [loanId, JSON.stringify(rep), closingInterest]);
  return Number(r.rows[0].id);
}

const LOAN = (n: string) => ({
  CustomerId: 1, ContractNumber: n, Amount: 400000000, InterestRate: 6.5,
  DisbursementDate: '2026-06-20', DueDate: '2027-02-15',
});

const one = async <T,>(db: PGlite, sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

describe('migration 76: huy động và cầm cố sổ tiết kiệm', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await buildDb();
  });
  afterAll(async () => {
    await db.close();
  });

  it('chu so huu tao va doc duoc so, nguoi la khong thay', async () => {
    await actAs(db, 'alice');
    await addBook(db, 1, 'STK-A-001');
    await actAs(db, 'carol');
    const seen = await db.query(`SELECT * FROM public."SavingsBooks"`);
    expect(seen.rows).toHaveLength(0);
    await expect(addBook(db, 1, 'STK-C-001')).rejects.toThrow();
    await actAs(db, 'alice');
    expect((await db.query(`SELECT * FROM public."SavingsBooks"`)).rows).toHaveLength(1);
  });

  it('save_pledge_loan tao khoan vay va 2 lien ket, so khac khach bi tu choi', async () => {
    await actAs(db, 'alice');
    const b1 = await addBook(db, 1, 'STK-A-101');
    const b2 = await addBook(db, 1, 'STK-A-102', 300000000);
    const loanId = await saveLoan(db, LOAN('CC-101'), [
      { SavingsBookId: b1, PrincipalCovered: 250000000 },
      { SavingsBookId: b2, PrincipalCovered: 150000000 },
    ]);
    const links = await db.query(`SELECT * FROM public."PledgeLoanSavingsBooks" WHERE "PledgeLoanId" = $1`, [loanId]);
    expect(links.rows).toHaveLength(2);

    const otherCustomerBook = await addBook(db, 2, 'STK-B-101');
    await expect(saveLoan(db, LOAN('CC-102'), [{ SavingsBookId: otherCustomerBook, PrincipalCovered: 400000000 }]))
      .rejects.toThrow(/không thuộc khách hàng của khoản vay/);
    expect((await db.query(`SELECT * FROM public."PledgeLoans" WHERE "ContractNumber" = 'CC-102'`)).rows).toHaveLength(0);
  });

  it('save_pledge_loan cap nhat thay lien ket cu', async () => {
    await actAs(db, 'alice');
    const b1 = await addBook(db, 1, 'STK-A-201');
    const b2 = await addBook(db, 1, 'STK-A-202');
    const loanId = await saveLoan(db, LOAN('CC-201'), [{ SavingsBookId: b1, PrincipalCovered: 400000000 }]);
    const again = await saveLoan(db, { ...LOAN('CC-201'), Id: loanId, Amount: 350000000 }, [{ SavingsBookId: b2, PrincipalCovered: 350000000 }]);
    expect(again).toBe(loanId);
    const links = await db.query<{ SavingsBookId: number }>(`SELECT "SavingsBookId" FROM public."PledgeLoanSavingsBooks" WHERE "PledgeLoanId" = $1`, [loanId]);
    expect(links.rows.map((r) => Number(r.SavingsBookId))).toEqual([b2]);
    expect(Number((await one<{ Amount: number }>(db, `SELECT "Amount" FROM public."PledgeLoans" WHERE "Id" = $1`, [loanId])).Amount)).toBe(350000000);
  });

  it('record_pledge_repayment partial ghi dong tra, khoan vay van mo', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-301');
    const loanId = await saveLoan(db, LOAN('CC-301'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 100000000, InterestPaid: 9189041, PenaltyPaid: 0 });
    const loan = await one<{ IsClosed: boolean }>(db, `SELECT "IsClosed" FROM public."PledgeLoans" WHERE "Id" = $1`, [loanId]);
    expect(loan.IsClosed).toBe(false);
    expect((await db.query(`SELECT * FROM public."PledgeLoanRepayments" WHERE "PledgeLoanId" = $1`, [loanId])).rows).toHaveLength(1);
  });

  it('partial voi goc >= du no bi tu choi', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-401');
    const loanId = await saveLoan(db, LOAN('CC-401'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-10-01', Kind: 'partial', PrincipalPaid: 100000000, InterestPaid: 0, PenaltyPaid: 0 });
    await expect(repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 300000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow(/Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ/);
    await expect(repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 0, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow(/Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ/);
  });

  it('full dong khoan vay va giai chap moi lien ket', async () => {
    await actAs(db, 'alice');
    const b1 = await addBook(db, 1, 'STK-A-501');
    const b2 = await addBook(db, 1, 'STK-A-502');
    const loanId = await saveLoan(db, LOAN('CC-501'), [
      { SavingsBookId: b1, PrincipalCovered: 200000000 },
      { SavingsBookId: b2, PrincipalCovered: 200000000 },
    ]);
    await repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'full', PrincipalPaid: 400000000, InterestPaid: 9189041, PenaltyPaid: 0 });
    const loan = await one<{ IsClosed: boolean; ClosedDate: string; ClosedHow: string }>(db,
      `SELECT "IsClosed", "ClosedDate"::text AS "ClosedDate", "ClosedHow" FROM public."PledgeLoans" WHERE "Id" = $1`, [loanId]);
    expect(loan).toEqual({ IsClosed: true, ClosedDate: '2026-10-27', ClosedHow: 'full' });
    const open = await db.query(`SELECT * FROM public."PledgeLoanSavingsBooks" WHERE "PledgeLoanId" = $1 AND "ReleasedDate" IS NULL`, [loanId]);
    expect(open.rows).toHaveLength(0);
  });

  it('full phai tra het du no', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-551');
    const loanId = await saveLoan(db, LOAN('CC-551'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await expect(repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'full', PrincipalPaid: 100000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow(/phải trả hết dư nợ/);
  });

  it('offset dong ca so va luu ClosingInterest', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-601');
    const loanId = await saveLoan(db, LOAN('CC-601'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'offset', PrincipalPaid: 400000000, InterestPaid: 9189041, PenaltyPaid: 0, OffsetSavingsBookId: b }, 534247);
    const book = await one<{ IsClosed: boolean; ClosedDate: string; ClosingInterest: string }>(db,
      `SELECT "IsClosed", "ClosedDate"::text AS "ClosedDate", "ClosingInterest" FROM public."SavingsBooks" WHERE "Id" = $1`, [b]);
    expect(book.IsClosed).toBe(true);
    expect(book.ClosedDate).toBe('2026-10-27');
    expect(Number(book.ClosingInterest)).toBe(534247);
  });

  it('offset thieu so bi tu choi', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-651');
    const loanId = await saveLoan(db, LOAN('CC-651'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await expect(repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'offset', PrincipalPaid: 400000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow();
  });

  it('tra no lan hai tren khoan da tat toan bi tu choi', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-701');
    const loanId = await saveLoan(db, LOAN('CC-701'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2027-02-15', Kind: 'due', PrincipalPaid: 400000000, InterestPaid: 17095890, PenaltyPaid: 0 });
    await expect(repay(db, loanId, { RepaymentDate: '2027-02-15', Kind: 'due', PrincipalPaid: 400000000, InterestPaid: 17095890, PenaltyPaid: 0 }))
      .rejects.toThrow(/Khoản vay đã tất toán/);
  });

  it('nguoi la khong ghi tra no duoc vao khoan vay cua nguoi khac', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-751');
    const loanId = await saveLoan(db, LOAN('CC-751'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await actAs(db, 'carol');
    await expect(repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'full', PrincipalPaid: 400000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow();
    await actAs(db, 'alice');
    expect((await db.query(`SELECT * FROM public."PledgeLoanRepayments" WHERE "PledgeLoanId" = $1`, [loanId])).rows).toHaveLength(0);
  });

  it('ngay tra truoc lan tra gan nhat bi tu choi', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-901');
    const loanId = await saveLoan(db, LOAN('CC-901'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-11-10', Kind: 'partial', PrincipalPaid: 100000000, InterestPaid: 0, PenaltyPaid: 0 });
    await expect(repay(db, loanId, { RepaymentDate: '2026-11-05', Kind: 'partial', PrincipalPaid: 50000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow(/Ngày trả phải từ ngày 2026-11-10 trở đi/);
    await expect(repay(db, loanId, { RepaymentDate: '2026-06-01', Kind: 'full', PrincipalPaid: 300000000, InterestPaid: 0, PenaltyPaid: 0 }))
      .rejects.toThrow(/Ngày trả phải từ ngày/);
  });

  it('tra khi den han luon ghi ngay den han', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-911');
    const loanId = await saveLoan(db, LOAN('CC-911'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'due', PrincipalPaid: 400000000, InterestPaid: 0, PenaltyPaid: 0 });
    const r = await one<{ d: string }>(db, `SELECT "RepaymentDate"::text AS d FROM public."PledgeLoanRepayments" WHERE "PledgeLoanId" = $1`, [loanId]);
    expect(r.d).toBe('2027-02-15');
  });

  it('khong can tru hai lan tren cung mot so da tat toan', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-921');
    const l1 = await saveLoan(db, LOAN('CC-921'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    const l2 = await saveLoan(db, { ...LOAN('CC-922'), Amount: 50000000 }, [{ SavingsBookId: b, PrincipalCovered: 50000000 }]);
    await repay(db, l1, { RepaymentDate: '2026-10-27', Kind: 'offset', PrincipalPaid: 400000000, InterestPaid: 0, PenaltyPaid: 0, OffsetSavingsBookId: b }, 1);
    await expect(repay(db, l2, { RepaymentDate: '2026-10-28', Kind: 'offset', PrincipalPaid: 50000000, InterestPaid: 0, PenaltyPaid: 0, OffsetSavingsBookId: b }, 2))
      .rejects.toThrow(/đã tất toán/);
  });

  it('khong sua so tien hay ngay giai ngan sau khi da tra', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-931');
    const loanId = await saveLoan(db, LOAN('CC-931'), [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    await repay(db, loanId, { RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 100000000, InterestPaid: 0, PenaltyPaid: 0 });
    await expect(saveLoan(db, { ...LOAN('CC-931'), Id: loanId, Amount: 50000000 }, [{ SavingsBookId: b, PrincipalCovered: 50000000 }]))
      .rejects.toThrow(/đã có lần trả nợ/);
    await expect(saveLoan(db, { ...LOAN('CC-931'), Id: loanId, DisbursementDate: '2026-11-01' }, [{ SavingsBookId: b, PrincipalCovered: 400000000 }]))
      .rejects.toThrow(/đã có lần trả nợ/);
    const ok = await saveLoan(db, { ...LOAN('CC-931'), Id: loanId, DueDate: '2027-03-01' }, [{ SavingsBookId: b, PrincipalCovered: 400000000 }]);
    expect(ok).toBe(loanId);
  });

  it('BookNumber trung sau chuan hoa bi tu choi', async () => {
    await actAs(db, 'alice');
    await addBook(db, 1, 'STK-A-801');
    await expect(addBook(db, 1, ' stk-a-801 ')).rejects.toThrow();
  });

  it('ngay den han phai sau ngay giai ngan', async () => {
    await actAs(db, 'alice');
    const b = await addBook(db, 1, 'STK-A-851');
    await expect(saveLoan(db, { ...LOAN('CC-851'), DueDate: '2026-06-20' }, [{ SavingsBookId: b, PrincipalCovered: 400000000 }]))
      .rejects.toThrow();
  });

  it('ham ghi khong goi duoc bang anon', async () => {
    await actAs(db, 'anon');
    await expect(db.query(`SELECT public.save_pledge_loan('{}'::jsonb, '[]'::jsonb)`)).rejects.toThrow(/permission denied/);
  });

  it('anon khong doc duoc bang nao', async () => {
    await actAs(db, 'anon');
    for (const t of ['SavingsBooks', 'PledgeLoans', 'PledgeLoanSavingsBooks', 'PledgeLoanRepayments']) {
      await expect(db.query(`SELECT * FROM public."${t}"`)).rejects.toThrow();
    }
  });

  it('cot danh dau da them vao ba bang cu', async () => {
    await actAs(db, 'master');
    for (const [t, c] of [['CreditContracts', 'MovedToPledgeLoanId'], ['LoanContracts', 'MovedToPledgeLoanId'], ['Collaterals', 'MovedToSavingsBookId']]) {
      await db.query(`SELECT "${c}" FROM public."${t}"`);
    }
  });

  it('rollback go sach, chay lai migration duoc', async () => {
    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    const left = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('SavingsBooks', 'PledgeLoans', 'PledgeLoanSavingsBooks', 'PledgeLoanRepayments')`);
    expect(left.rows).toHaveLength(0);
    const col = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'LoanContracts' AND column_name = 'MovedToPledgeLoanId'`);
    expect(col.rows).toHaveLength(0);
    await db.exec(MIGRATION);
  });
});
