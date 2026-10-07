// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(resolve(process.cwd(), 'supabase/migrations/66_chuyen_giao_khach_hang.sql'), 'utf8');
const ROLLBACK = readFileSync(resolve(process.cwd(), 'supabase/rollbacks/66_chuyen_giao_khach_hang_rollback.sql'), 'utf8');

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  userAdmin: '00000000-0000-0000-0000-000000000002',
  alice: '00000000-0000-0000-0000-00000000000a',
  bob: '00000000-0000-0000-0000-00000000000b',
  carol: '00000000-0000-0000-0000-00000000000c',
  noRole: '00000000-0000-0000-0000-00000000000d',
};

const RELATED = ['CreditContracts', 'LoanContracts', 'Collaterals', 'MortgageContracts', 'CardContracts', 'PostLoanControlRecords'];

async function buildDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  `);
  await db.exec(`
    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id), "Role" text NOT NULL);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" IN ('master_admin', 'user_admin')) $$;

    CREATE TABLE public."Customers" ("Id" integer PRIMARY KEY, "OwnerId" uuid, "FullName" text);
    CREATE TABLE public."CreditContracts" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."LoanContracts" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."Collaterals" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."MortgageContracts" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."CardContracts" ("Id" bigserial PRIMARY KEY, "CustomerId" bigint);
    CREATE TABLE public."PostLoanControlRecords" ("Id" serial PRIMARY KEY, "CustomerId" integer);
    CREATE TABLE public."Dispatches" ("Id" bigserial PRIMARY KEY, "CustomerId" bigint, "OwnerId" uuid);

    ALTER TABLE public."Customers" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY customers_select ON public."Customers" FOR SELECT TO authenticated USING (public.is_admin() OR "OwnerId" = auth.uid());
    CREATE POLICY customers_update ON public."Customers" FOR UPDATE TO authenticated USING (public.is_admin());

    INSERT INTO auth.users (id) VALUES ${Object.values(ID).map((i) => `('${i}')`).join(', ')};
    INSERT INTO public."UserRoles" VALUES
      ('${ID.master}', 'master_admin'), ('${ID.userAdmin}', 'user_admin'),
      ('${ID.alice}', 'user'), ('${ID.bob}', 'user'), ('${ID.carol}', 'user');

    INSERT INTO public."Customers" VALUES (1, '${ID.alice}', 'An'), (2, '${ID.alice}', 'Bình'), (3, '${ID.carol}', 'Chi'), (4, '${ID.alice}', 'Dũng');
  `);
  for (const t of RELATED) {
    // Khách 1: 2 hồ sơ mỗi loại; khách 2: 1; khách 3 (của Carol): 1; khách 4: 1
    await db.exec(`INSERT INTO public."${t}" ("CustomerId") VALUES (1), (1), (2), (3), (4)`);
  }
  await db.exec(`
    INSERT INTO public."Dispatches" ("CustomerId", "OwnerId") VALUES
      (1, '${ID.alice}'),
      (2, '${ID.carol}'),
      (3, '${ID.carol}'),
      (4, '${ID.alice}'),
      (NULL, '${ID.alice}');
  `);
  await db.exec(MIGRATION);
  return db;
}

async function actAs(db: PGlite, who: 'anon' | keyof typeof ID) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(`SET ROLE ${who === 'anon' ? 'anon' : 'authenticated'}`);
}

const transfer = (db: PGlite, from: string, to: string, ids: number[]) =>
  db.query<{ r: Record<string, number> }>(`SELECT public.transfer_customers($1::uuid, $2::uuid, $3::integer[]) AS r`, [from, to, ids]);
const preview = (db: PGlite, from: string, ids: number[]) =>
  db.query<{ r: Record<string, number> }>(`SELECT public.customer_transfer_preview($1::uuid, $2::integer[]) AS r`, [from, ids]);
const ownersOf = async (db: PGlite) =>
  Object.fromEntries((await db.query<{ Id: number; OwnerId: string }>(`SELECT "Id", "OwnerId" FROM public."Customers" ORDER BY "Id"`)).rows.map((r) => [r.Id, r.OwnerId]));
const logCount = async (db: PGlite) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public."CustomerTransfers"`)).rows[0].n;

describe('migration 66: chuyển giao khách hàng', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('chạy lại migration không lỗi (idempotent)', async () => {
    await db.exec('RESET ROLE');
    await expect(db.exec(MIGRATION)).resolves.toBeDefined();
  });

  it('khách chưa đăng nhập không gọi được hàm nào', async () => {
    await actAs(db, 'anon');
    await expect(transfer(db, ID.alice, ID.bob, [1])).rejects.toThrow(/permission denied/);
    await expect(preview(db, ID.alice, [1])).rejects.toThrow(/permission denied/);
  });

  it('hàm đếm nội bộ không mở cho client', async () => {
    await actAs(db, 'userAdmin');
    await expect(db.query(`SELECT public.customer_transfer_counts(ARRAY[1], '${ID.alice}')`)).rejects.toThrow(/permission denied/);
  });

  it('tài khoản cấp User không xem trước hay chuyển được, kể cả khách của chính mình', async () => {
    await actAs(db, 'alice');
    await expect(transfer(db, ID.alice, ID.bob, [1])).rejects.toThrow(/Chỉ Master Admin và User Admin/);
    await expect(preview(db, ID.alice, [1])).rejects.toThrow(/Chỉ Master Admin và User Admin/);
    await db.exec('RESET ROLE');
    expect((await ownersOf(db))[1]).toBe(ID.alice);
    expect(await logCount(db)).toBe(0);
  });

  it('xem trước đếm đúng hồ sơ gắn với các khách của người chuyển, không đổi dữ liệu', async () => {
    await actAs(db, 'userAdmin');
    const { rows } = await preview(db, ID.alice, [1, 2]);
    expect(rows[0].r).toEqual({
      customers: 2, creditContracts: 3, loans: 3, collaterals: 3, mortgages: 3, cards: 3, postLoan: 3, dispatches: 1,
    });
    await db.exec('RESET ROLE');
    expect((await ownersOf(db))[1]).toBe(ID.alice);
  });

  it('chỉ tính và chuyển khách đang thuộc người chuyển, bỏ qua khách của người khác trong danh sách chọn', async () => {
    await actAs(db, 'userAdmin');
    const { rows } = await preview(db, ID.alice, [1, 3]);
    expect(rows[0].r.customers).toBe(1);
    expect(rows[0].r.creditContracts).toBe(2);
  });

  it('chuyển giao: đổi người phụ trách, chuyển văn bản gắn khách của người chuyển, giữ nguyên phần còn lại', async () => {
    await actAs(db, 'userAdmin');
    const { rows } = await transfer(db, ID.alice, ID.bob, [1, 2, 3]);
    const result = rows[0].r;
    expect(result).toMatchObject({ customers: 2, creditContracts: 3, loans: 3, collaterals: 3, mortgages: 3, cards: 3, postLoan: 3, dispatches: 1 });
    expect(typeof result.transferId).toBe('number');

    await db.exec('RESET ROLE');
    expect(await ownersOf(db)).toEqual({ 1: ID.bob, 2: ID.bob, 3: ID.carol, 4: ID.alice });

    const disp = (await db.query<{ CustomerId: number | null; OwnerId: string }>(`SELECT "CustomerId", "OwnerId" FROM public."Dispatches" ORDER BY "Id"`)).rows;
    expect(disp.map((d) => d.OwnerId)).toEqual([ID.bob, ID.carol, ID.carol, ID.alice, ID.alice]);

    for (const t of RELATED) {
      const ids = (await db.query<{ CustomerId: number }>(`SELECT "CustomerId" FROM public."${t}" ORDER BY "Id"`)).rows.map((r) => Number(r.CustomerId));
      expect(ids, t).toEqual([1, 1, 2, 3, 4]);
    }
  });

  it('ghi nhật ký đủ: ai chuyển cho ai, khách nào, bao nhiêu hồ sơ', async () => {
    await db.exec('RESET ROLE');
    const { rows } = await db.query<{ FromUserId: string; ToUserId: string; CustomerIds: number[]; Counts: Record<string, number>; TransferredBy: string | null }>(
      `SELECT "FromUserId", "ToUserId", "CustomerIds", "Counts", "TransferredBy" FROM public."CustomerTransfers"`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ FromUserId: ID.alice, ToUserId: ID.bob, CustomerIds: [1, 2] });
    expect(rows[0].Counts).toMatchObject({ customers: 2, loans: 3, dispatches: 1 });
  });

  it('hai vai trò quản trị đọc được nhật ký, tài khoản cấp User thì không', async () => {
    await actAs(db, 'master');
    expect(await logCount(db)).toBe(1);
    await actAs(db, 'bob');
    expect(await logCount(db)).toBe(0);
  });

  it('không ai ghi trực tiếp vào nhật ký, kể cả admin', async () => {
    await actAs(db, 'master');
    await expect(
      db.query(`INSERT INTO public."CustomerTransfers" ("FromUserId", "ToUserId", "CustomerIds", "Counts") VALUES (NULL, NULL, '{}', '{}')`),
    ).rejects.toThrow(/permission denied/);
  });

  it('chuyển lại lần nữa chỉ chuyển khách còn thuộc người chuyển', async () => {
    await actAs(db, 'master');
    const { rows } = await transfer(db, ID.bob, ID.carol, [1, 2, 4]);
    expect(rows[0].r.customers).toBe(2);
    await db.exec('RESET ROLE');
    expect(await ownersOf(db)).toEqual({ 1: ID.carol, 2: ID.carol, 3: ID.carol, 4: ID.alice });
    expect(await logCount(db)).toBe(2);
  });

  describe('đầu vào sai: báo lỗi rõ, không đổi gì và không ghi nhật ký', () => {
    const cases: [string, () => [string, string, number[]], RegExp][] = [
      ['trùng người chuyển và người nhận', () => [ID.alice, ID.alice, [4]], /hai tài khoản khác nhau/],
      ['người nhận chưa có vai trò', () => [ID.alice, ID.noRole, [4]], /chưa được phân quyền/],
      ['danh sách chọn không có khách nào của người chuyển', () => [ID.bob, ID.carol, [4]], /Không có khách hàng nào/],
      ['danh sách rỗng', () => [ID.alice, ID.bob, []], /Không có khách hàng nào/],
    ];
    it.each(cases)('%s', async (_name, args, message) => {
      await db.exec('RESET ROLE');
      const before = { owners: await ownersOf(db), log: await logCount(db) };
      await actAs(db, 'userAdmin');
      const [from, to, ids] = args();
      await expect(transfer(db, from, to, ids)).rejects.toThrow(message);
      await db.exec('RESET ROLE');
      expect(await ownersOf(db)).toEqual(before.owners);
      expect(await logCount(db)).toBe(before.log);
    });
  });

  it('nguyên tử: lỗi ở bước chuyển văn bản thì khách không đổi chủ và không ghi nhật ký', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`
      CREATE FUNCTION public.fail_dispatch_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'loi gia lap'; END $$;
      CREATE TRIGGER trg_fail BEFORE UPDATE ON public."Dispatches" FOR EACH ROW EXECUTE FUNCTION public.fail_dispatch_update();
    `);
    const before = { owners: await ownersOf(db), log: await logCount(db) };
    await actAs(db, 'userAdmin');
    await expect(transfer(db, ID.alice, ID.bob, [4])).rejects.toThrow(/loi gia lap/);
    await db.exec('RESET ROLE');
    expect(await ownersOf(db)).toEqual(before.owners);
    expect(await logCount(db)).toBe(before.log);
    await db.exec(`DROP TRIGGER trg_fail ON public."Dispatches"`);
  });
});

describe('tập lệnh gỡ migration 66', () => {
  it('bỏ ba hàm, giữ bảng nhật ký', async () => {
    const db = await buildDb();
    await db.exec(ROLLBACK);
    const fns = await db.query(`SELECT proname FROM pg_proc WHERE proname IN ('transfer_customers', 'customer_transfer_preview', 'customer_transfer_counts')`);
    expect(fns.rows).toEqual([]);
    const tbl = await db.query(`SELECT to_regclass('public."CustomerTransfers"') AS t`);
    expect(tbl.rows[0]).toMatchObject({ t: expect.anything() });
    await db.close();
  }, 120_000);
});
