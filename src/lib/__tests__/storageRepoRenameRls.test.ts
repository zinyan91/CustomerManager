// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(resolve(process.cwd(), 'supabase/migrations/67_sua_repo_kho_luu_tru.sql'), 'utf8');
const ROLLBACK = readFileSync(resolve(process.cwd(), 'supabase/rollbacks/67_sua_repo_kho_luu_tru_rollback.sql'), 'utf8');

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  userAdmin: '00000000-0000-0000-0000-000000000002',
  user: '00000000-0000-0000-0000-000000000003',
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
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id), "Role" text NOT NULL);
    CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" = 'master_admin') $$;

    CREATE TABLE public."StorageRepos" (
      "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "Name" text NOT NULL, "RepoId" text NOT NULL UNIQUE, "Folder" text, "Kind" text NOT NULL);
    CREATE TABLE public."OfficialDocuments" ("Id" serial PRIMARY KEY, "DocNumber" text, "Files" jsonb NOT NULL DEFAULT '[]'::jsonb);
    CREATE TABLE public."Dispatches" ("Id" bigserial PRIMARY KEY, "RepoId" text);

    ALTER TABLE public."StorageRepos" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY repos_select ON public."StorageRepos" FOR SELECT TO authenticated USING (true);
    CREATE POLICY repos_update ON public."StorageRepos" FOR UPDATE TO authenticated USING (public.is_master_admin());

    INSERT INTO auth.users (id) VALUES ${Object.values(ID).map((i) => `('${i}')`).join(', ')};
    INSERT INTO public."UserRoles" VALUES ('${ID.master}', 'master_admin'), ('${ID.userAdmin}', 'user_admin'), ('${ID.user}', 'user');

    INSERT INTO public."StorageRepos" ("Name", "RepoId", "Folder", "Kind") VALUES
      ('Văn thư', 'Ying91/van-thu-tin-dung', NULL, 'dispatch'),
      ('Biểu mẫu', 'Ying91/cm-bieu-mau', 'mau', 'form'),
      ('Kho chung', 'Ying91/cm-kho-chung', NULL, 'shared');

    INSERT INTO public."OfficialDocuments" ("DocNumber", "Files") VALUES
      ('A', '[{"kind":"goc","repoId":"Ying91/van-thu-tin-dung","path":"a/1.pdf","name":"1.pdf"},{"kind":"bieu-mau","repoId":"Ying91/cm-bieu-mau","path":"m/1.zip","name":"1.zip"}]'),
      ('B', '[{"kind":"goc","repoId":"Ying91/van-thu-tin-dung","path":"b/2.pdf","name":"2.pdf"}]'),
      ('C', '[{"kind":"bieu-mau","repoId":"Ying91/cm-bieu-mau","path":"m/3.zip","name":"3.zip"}]'),
      ('D', '[]');
    INSERT INTO public."Dispatches" ("RepoId") VALUES ('Ying91/van-thu-tin-dung'), ('Ying91/cm-kho-chung');
  `);
  await db.exec(MIGRATION);
  return db;
}

async function actAs(db: PGlite, who: 'anon' | keyof typeof ID) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(`SET ROLE ${who === 'anon' ? 'anon' : 'authenticated'}`);
}

const rename = (db: PGlite, id: number, name: string, repoId: string, folder: string | null) =>
  db.query<{ r: { documents: number; dispatches: number } }>(
    `SELECT public.update_storage_repo($1::bigint, $2, $3, $4) AS r`, [id, name, repoId, folder]);
const repos = async (db: PGlite) =>
  (await db.query<{ Id: number; Name: string; RepoId: string; Folder: string | null }>(`SELECT "Id", "Name", "RepoId", "Folder" FROM public."StorageRepos" ORDER BY "Id"`)).rows;
const docFiles = async (db: PGlite) =>
  Object.fromEntries((await db.query<{ DocNumber: string; Files: Array<Record<string, string>> }>(`SELECT "DocNumber", "Files" FROM public."OfficialDocuments"`)).rows.map((r) => [r.DocNumber, r.Files]));
const dispatchRepos = async (db: PGlite) =>
  (await db.query<{ RepoId: string }>(`SELECT "RepoId" FROM public."Dispatches" ORDER BY "Id"`)).rows.map((r) => r.RepoId);

describe('migration 67: sửa repo kho lưu trữ', () => {
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

  it('khách chưa đăng nhập, User và User Admin đều không sửa được', async () => {
    await actAs(db, 'anon');
    await expect(rename(db, 1, 'X', 'Ying91/x', null)).rejects.toThrow(/permission denied/);
    for (const who of ['user', 'userAdmin'] as const) {
      await actAs(db, who);
      await expect(rename(db, 1, 'X', 'Ying91/x', null)).rejects.toThrow(/Chỉ Master Admin/);
    }
    await db.exec('RESET ROLE');
    expect((await repos(db))[0]).toMatchObject({ Name: 'Văn thư', RepoId: 'Ying91/van-thu-tin-dung' });
  });

  it('chỉ đổi tên và thư mục: không đụng văn bản, chuẩn hóa dấu gạch chéo', async () => {
    await actAs(db, 'master');
    const { rows } = await rename(db, 2, '  Biểu mẫu chung  ', 'Ying91/cm-bieu-mau', '/mau/2026/');
    expect(rows[0].r).toEqual({ documents: 0, dispatches: 0 });
    await db.exec('RESET ROLE');
    expect((await repos(db))[1]).toMatchObject({ Name: 'Biểu mẫu chung', RepoId: 'Ying91/cm-bieu-mau', Folder: 'mau/2026' });
    expect((await docFiles(db)).C[0].repoId).toBe('Ying91/cm-bieu-mau');
  });

  it('thư mục trống hoặc chỉ khoảng trắng thành NULL', async () => {
    await actAs(db, 'master');
    await rename(db, 2, 'Biểu mẫu', 'Ying91/cm-bieu-mau', '  /  ');
    await db.exec('RESET ROLE');
    expect((await repos(db))[1].Folder).toBeNull();
  });

  it('đổi Repository ID: cập nhật đúng tệp của repo đó trong văn bản và Dispatches, giữ nguyên phần còn lại', async () => {
    await actAs(db, 'master');
    const { rows } = await rename(db, 1, 'Văn thư', 'Ying91/van-thu-tin-dung-2', null);
    expect(rows[0].r).toEqual({ documents: 2, dispatches: 1 });
    await db.exec('RESET ROLE');
    expect((await repos(db))[0].RepoId).toBe('Ying91/van-thu-tin-dung-2');
    const files = await docFiles(db);
    expect(files.A).toEqual([
      { kind: 'goc', repoId: 'Ying91/van-thu-tin-dung-2', path: 'a/1.pdf', name: '1.pdf' },
      { kind: 'bieu-mau', repoId: 'Ying91/cm-bieu-mau', path: 'm/1.zip', name: '1.zip' },
    ]);
    expect(files.B).toEqual([{ kind: 'goc', repoId: 'Ying91/van-thu-tin-dung-2', path: 'b/2.pdf', name: '2.pdf' }]);
    expect(files.C[0].repoId).toBe('Ying91/cm-bieu-mau');
    expect(files.D).toEqual([]);
    expect(await dispatchRepos(db)).toEqual(['Ying91/van-thu-tin-dung-2', 'Ying91/cm-kho-chung']);
  });

  it('đầu vào sai: báo lỗi rõ và không đổi gì', async () => {
    await db.exec('RESET ROLE');
    const before = { repos: await repos(db), docs: await docFiles(db) };
    await actAs(db, 'master');
    const cases: [string, () => ReturnType<typeof rename>, RegExp][] = [
      ['tên trống', () => rename(db, 3, '   ', 'Ying91/cm-kho-chung', null), /tên hiển thị/],
      ['ID thiếu owner', () => rename(db, 3, 'K', 'cm-kho-chung', null), /Repository ID cần dạng/],
      ['ID có dấu cách', () => rename(db, 3, 'K', 'Ying91/kho chung', null), /Repository ID cần dạng/],
      ['ID trùng repo khác', () => rename(db, 3, 'K', 'Ying91/cm-bieu-mau', null), /đã được repo khác dùng/],
      ['không có repo', () => rename(db, 999, 'K', 'Ying91/moi', null), /Không tìm thấy repo/],
    ];
    for (const [name, run, message] of cases) await expect(run(), name).rejects.toThrow(message);
    await db.exec('RESET ROLE');
    expect(await repos(db)).toEqual(before.repos);
    expect(await docFiles(db)).toEqual(before.docs);
  });

  it('nguyên tử: lỗi ở bước cập nhật Dispatches thì repo và văn bản không đổi', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`
      CREATE FUNCTION public.fail_dispatch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'loi gia lap'; END $$;
      CREATE TRIGGER trg_fail BEFORE UPDATE ON public."Dispatches" FOR EACH ROW EXECUTE FUNCTION public.fail_dispatch();
    `);
    const before = { repos: await repos(db), docs: await docFiles(db) };
    await actAs(db, 'master');
    await expect(rename(db, 3, 'Kho chung', 'Ying91/cm-kho-chung-moi', null)).rejects.toThrow(/loi gia lap/);
    await db.exec('RESET ROLE');
    expect(await repos(db)).toEqual(before.repos);
    expect(await docFiles(db)).toEqual(before.docs);
    await db.exec(`DROP TRIGGER trg_fail ON public."Dispatches"`);
  });
});

describe('tập lệnh gỡ migration 67', () => {
  it('bỏ hàm sửa repo', async () => {
    const db = await buildDb();
    await db.exec(ROLLBACK);
    const fns = await db.query(`SELECT proname FROM pg_proc WHERE proname = 'update_storage_repo'`);
    expect(fns.rows).toEqual([]);
    await db.close();
  }, 120_000);
});
