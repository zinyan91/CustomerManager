// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(resolve(process.cwd(), 'supabase/migrations/65_user_modules.sql'), 'utf8');
const ROLLBACK = readFileSync(resolve(process.cwd(), 'supabase/rollbacks/65_user_modules_rollback.sql'), 'utf8');

const CREDIT = [
  'Customers', 'CreditContracts', 'LoanContracts', 'RepaymentSchedules', 'Collaterals', 'CollateralAppraisals',
  'MortgageContracts', 'MortgageContractCollaterals', 'MortgageContractCreditContracts', 'CardContracts',
  'CardSupplementaryHolders', 'PostLoanControlRecords', 'DisbursementPayees',
];
const RATES = [
  'RatePrograms', 'RateProgramConditions', 'RateProgramFbeCodes', 'RateProgramFeeOptions', 'RateProgramPrepaymentFees',
  'RateProgramTiers', 'CofPrograms', 'CofRateItems', 'CofStandardRates', 'DepositRateAuthorities',
];
const DISPATCH = ['OfficialDocuments', 'Dispatches', 'AiAnswerCache'];
const INVENTORY = [
  'InventoryItems', 'InventoryCategoryTemplates', 'SaleCatalogProfiles', 'StatementTemplates', 'PurchaseStatements', 'RetailInvoices',
];
const QUIZ = ['QuizQuestions'];
const MODULE_TABLES = [...CREDIT, ...DISPATCH, ...INVENTORY, ...QUIZ];
const ALL_TABLES = [...MODULE_TABLES, ...RATES];
// Bảng thật đang mở cho người chưa đăng nhập (chính sách role public/anon, điều kiện true)
const OPEN_TO_ANON = ['DisbursementPayees', ...INVENTORY];

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  userAdmin: '00000000-0000-0000-0000-000000000002',
  noRow: '00000000-0000-0000-0000-000000000003',
  dispatchOnly: '00000000-0000-0000-0000-000000000004',
  none: '00000000-0000-0000-0000-000000000005',
  creditOnly: '00000000-0000-0000-0000-000000000006',
};

const q = (t: string) => `public."${t}"`;

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

    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, "Role" text NOT NULL);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" IN ('master_admin', 'user_admin')) $$;
    CREATE TABLE public."SystemConfig" ("Key" text PRIMARY KEY, "Value" jsonb NOT NULL DEFAULT '{}'::jsonb);
    CREATE TABLE public."StorageRepos" ("Kind" text NOT NULL, "v" text);
  `);

  for (const t of ALL_TABLES) await db.exec(`CREATE TABLE ${q(t)} (v text)`);
  for (const t of [...ALL_TABLES, 'SystemConfig', 'StorageRepos']) await db.exec(`ALTER TABLE ${q(t)} ENABLE ROW LEVEL SECURITY`);
  for (const t of ALL_TABLES) {
    const to = OPEN_TO_ANON.includes(t) ? 'public' : 'authenticated';
    await db.exec(`CREATE POLICY open_all ON ${q(t)} FOR ALL TO ${to} USING (true) WITH CHECK (true)`);
  }
  await db.exec(`
    CREATE POLICY open_all ON public."SystemConfig" FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY open_all ON public."StorageRepos" FOR ALL TO authenticated USING (true) WITH CHECK (true);

    INSERT INTO auth.users (id) VALUES ${Object.values(ID).map((i) => `('${i}')`).join(', ')};
    INSERT INTO public."UserRoles" VALUES
      ('${ID.master}', 'master_admin'), ('${ID.userAdmin}', 'user_admin'), ('${ID.noRow}', 'user'),
      ('${ID.dispatchOnly}', 'user'), ('${ID.none}', 'user'), ('${ID.creditOnly}', 'user');
    INSERT INTO public."SystemConfig" VALUES ('hf_config', '{"token":"x"}'), ('other', '{}');
    INSERT INTO public."StorageRepos" VALUES ('shared', 's'), ('personal', 'p'), ('dispatch', 'd'), ('form', 'f');
  `);
  for (const t of ALL_TABLES) await db.exec(`INSERT INTO ${q(t)} (v) VALUES ('${t}')`);
  return db;
}

async function actAs(db: PGlite, who: 'anon' | keyof typeof ID) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(`SET ROLE ${who === 'anon' ? 'anon' : 'authenticated'}`);
}

const count = async (db: PGlite, sql: string) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${sql}`)).rows[0].n;
const countTable = (db: PGlite, t: string) => count(db, q(t));

async function seeAll(db: PGlite, tables: string[]) {
  for (const t of tables) expect(await countTable(db, t), t).toBe(1);
}
async function seeNone(db: PGlite, tables: string[]) {
  for (const t of tables) expect(await countTable(db, t), t).toBe(0);
}
const repoKinds = async (db: PGlite) =>
  (await db.query<{ Kind: string }>(`SELECT "Kind" FROM public."StorageRepos" ORDER BY "Kind"`)).rows.map((r) => r.Kind);
const configKeys = async (db: PGlite) =>
  (await db.query<{ Key: string }>(`SELECT "Key" FROM public."SystemConfig" ORDER BY "Key"`)).rows.map((r) => r.Key);

describe('migration 65: cờ module chặn bằng RLS', () => {
  let db: PGlite;
  let anonSawBefore: number[];

  beforeAll(async () => {
    db = await buildDb();
    await actAs(db, 'anon');
    anonSawBefore = await Promise.all(OPEN_TO_ANON.map((t) => countTable(db, t)));
    await db.exec('RESET ROLE');
    await db.exec(MIGRATION);
    await db.exec(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES
      ('${ID.userAdmin}', '{}'), ('${ID.dispatchOnly}', '{dispatch}'), ('${ID.none}', '{}'), ('${ID.creditOnly}', '{credit}')`);
  }, 120_000);

  afterAll(async () => {
    await db.close();
  });

  it('dữ liệu giả lập tái hiện đúng lỗ hổng cũ: khách chưa đăng nhập đọc được các bảng mở', () => {
    expect(anonSawBefore).toEqual(OPEN_TO_ANON.map(() => 1));
  });

  it('chạy lại migration không lỗi (idempotent)', async () => {
    await db.exec('RESET ROLE');
    await expect(db.exec(MIGRATION)).resolves.toBeDefined();
  });

  it('khách chưa đăng nhập không đọc, không ghi được bảng nào, kể cả bảng từng mở', async () => {
    await actAs(db, 'anon');
    await seeNone(db, ALL_TABLES);
    for (const t of OPEN_TO_ANON) {
      await expect(db.query(`INSERT INTO ${q(t)} (v) VALUES ('x')`), t).rejects.toThrow(/row-level security/);
    }
    expect(await repoKinds(db)).toEqual([]);
  });

  it('khách chưa đăng nhập không đọc được bảng cờ module', async () => {
    await actAs(db, 'anon');
    await expect(db.query(`SELECT * FROM public."UserModules"`)).rejects.toThrow(/permission denied/);
  });

  it('tài khoản chưa có dòng cờ vẫn đủ quyền mọi bảng (tương thích ngược)', async () => {
    await actAs(db, 'noRow');
    await seeAll(db, ALL_TABLES);
    expect(await repoKinds(db)).toEqual(['dispatch', 'form', 'personal', 'shared']);
    expect(await configKeys(db)).toEqual(['hf_config', 'other']);
  });

  it('tài khoản chỉ có Văn thư: đọc Văn thư, kho Văn thư và Biểu mẫu, token kho; mọi thứ khác bị chặn', async () => {
    await actAs(db, 'dispatchOnly');
    await seeAll(db, DISPATCH);
    await seeNone(db, [...CREDIT, ...RATES, ...INVENTORY, ...QUIZ]);
    expect(await repoKinds(db)).toEqual(['dispatch', 'form']);
    expect(await configKeys(db)).toEqual(['hf_config', 'other']);
    await expect(db.query(`INSERT INTO ${q('Customers')} (v) VALUES ('x')`)).rejects.toThrow(/row-level security/);
    await expect(db.query(`INSERT INTO ${q('OfficialDocuments')} (v) VALUES ('ok')`)).resolves.toBeDefined();
    await db.exec('RESET ROLE');
    await db.exec(`DELETE FROM ${q('OfficialDocuments')} WHERE v = 'ok'`);
  });

  it('tài khoản không có module nào: không bảng nào, không kho, không token kho, vẫn đọc cấu hình khác', async () => {
    await actAs(db, 'none');
    await seeNone(db, ALL_TABLES);
    expect(await repoKinds(db)).toEqual([]);
    expect(await configKeys(db)).toEqual(['other']);
  });

  it('chỉ có Hồ sơ tín dụng: đọc được hồ sơ và bảng lãi suất đi kèm, không đọc Văn thư, kho, token', async () => {
    await actAs(db, 'creditOnly');
    await seeAll(db, [...CREDIT, ...RATES]);
    await seeNone(db, [...DISPATCH, ...INVENTORY, ...QUIZ]);
    expect(await repoKinds(db)).toEqual([]);
    expect(await configKeys(db)).toEqual(['other']);
  });

  it('Master Admin và User Admin luôn đủ quyền, kể cả khi dòng cờ của User Admin là rỗng', async () => {
    for (const who of ['master', 'userAdmin'] as const) {
      await actAs(db, who);
      await seeAll(db, ALL_TABLES);
      expect(await repoKinds(db)).toEqual(['dispatch', 'form', 'personal', 'shared']);
      expect(await configKeys(db)).toEqual(['hf_config', 'other']);
    }
  });

  it('người dùng chỉ đọc được dòng cờ của chính mình và không tự sửa được', async () => {
    await actAs(db, 'dispatchOnly');
    expect(await count(db, 'public."UserModules"')).toBe(1);
    await expect(
      db.query(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES ('${ID.noRow}', '{credit}')`),
    ).rejects.toThrow(/row-level security/);
    const upd = await db.query(`UPDATE public."UserModules" SET "Modules" = '{credit,dispatch}' WHERE "UserId" = '${ID.dispatchOnly}'`);
    expect(upd.affectedRows).toBe(0);
    await db.exec('RESET ROLE');
    const stored = await db.query<{ Modules: string[] }>(`SELECT "Modules" FROM public."UserModules" WHERE "UserId" = '${ID.dispatchOnly}'`);
    expect(stored.rows[0].Modules).toEqual(['dispatch']);
  });

  it('User Admin sửa được cờ của người dùng và của User Admin khác nhưng không của Master Admin', async () => {
    await actAs(db, 'userAdmin');
    expect(await count(db, 'public."UserModules"')).toBe(4);
    await expect(
      db.query(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES ('${ID.noRow}', '{quiz}')`),
    ).resolves.toBeDefined();
    const upd = await db.query(`UPDATE public."UserModules" SET "Modules" = '{quiz,tools}' WHERE "UserId" = '${ID.noRow}'`);
    expect(upd.affectedRows).toBe(1);
    await expect(
      db.query(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES ('${ID.master}', '{}')`),
    ).rejects.toThrow(/row-level security/);
    await db.exec('RESET ROLE');
    await db.exec(`DELETE FROM public."UserModules" WHERE "UserId" = '${ID.noRow}'`);
  });

  it('Master Admin sửa được cờ của User Admin và của người dùng', async () => {
    await actAs(db, 'master');
    const upd = await db.query(`UPDATE public."UserModules" SET "Modules" = '{dispatch}' WHERE "UserId" = '${ID.userAdmin}'`);
    expect(upd.affectedRows).toBe(1);
    await db.exec('RESET ROLE');
    await db.exec(`UPDATE public."UserModules" SET "Modules" = '{}' WHERE "UserId" = '${ID.userAdmin}'`);
  });

  it('đổi cờ có hiệu lực ngay ở truy vấn kế tiếp, không cần đăng nhập lại', async () => {
    await actAs(db, 'creditOnly');
    expect(await countTable(db, 'OfficialDocuments')).toBe(0);
    await db.exec('RESET ROLE');
    await db.exec(`UPDATE public."UserModules" SET "Modules" = '{credit,dispatch}' WHERE "UserId" = '${ID.creditOnly}'`);
    await actAs(db, 'creditOnly');
    expect(await countTable(db, 'OfficialDocuments')).toBe(1);
    await db.exec('RESET ROLE');
    await db.exec(`UPDATE public."UserModules" SET "Modules" = '{credit}' WHERE "UserId" = '${ID.creditOnly}'`);
  });

  it('từ chối tên module lạ', async () => {
    await db.exec('RESET ROLE');
    await expect(
      db.query(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES ('${ID.noRow}', '{khong-co}')`),
    ).rejects.toThrow(/UserModules_known_modules/);
  });

  it('xóa tài khoản thì xóa luôn dòng cờ', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`DELETE FROM auth.users WHERE id = '${ID.none}'`);
    expect(await count(db, 'public."UserModules"')).toBe(3);
  });
});

describe('tập lệnh gỡ migration 65', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await buildDb();
    await db.exec(MIGRATION);
    await db.exec(`INSERT INTO public."UserModules" ("UserId", "Modules") VALUES ('${ID.none}', '{}')`);
  }, 120_000);

  afterAll(async () => {
    await db.close();
  });

  it('xóa mọi chính sách mod_*, giữ bảng cờ, trả quyền về như trước migration', async () => {
    await actAs(db, 'none');
    await seeNone(db, ALL_TABLES);

    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    const left = await db.query(`SELECT policyname FROM pg_policies WHERE policyname LIKE 'mod\\_%'`);
    expect(left.rows).toEqual([]);

    await actAs(db, 'none');
    await seeAll(db, ALL_TABLES);
    expect(await repoKinds(db)).toEqual(['dispatch', 'form', 'personal', 'shared']);
    expect(await configKeys(db)).toEqual(['hf_config', 'other']);
    await db.exec('RESET ROLE');
    expect(await count(db, 'public."UserModules"')).toBe(1);
  });
});
