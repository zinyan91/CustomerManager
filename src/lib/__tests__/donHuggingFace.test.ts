// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M67 = read('supabase/migrations/67_sua_repo_kho_luu_tru.sql');
const M68 = read('supabase/migrations/68_kho_luu_tru_google_drive.sql');
const M69 = read('supabase/migrations/69_chuyen_repo_sang_drive.sql');
const M70 = read('supabase/migrations/70_don_huggingface.sql');
const ROLLBACK = read('supabase/rollbacks/70_don_huggingface_rollback.sql');

const ID = { master: '00000000-0000-0000-0000-000000000001', user: '00000000-0000-0000-0000-000000000003' };
const ROOT_A = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const ROOT_B = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765';

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
    CREATE FUNCTION public.has_module(m text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;

    CREATE TABLE public."SystemConfig" ("Key" text PRIMARY KEY, "Value" jsonb);
    ALTER TABLE public."SystemConfig" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "read_all" ON public."SystemConfig" FOR SELECT TO authenticated USING (true);
    CREATE POLICY "mod_hf_config" ON public."SystemConfig" AS RESTRICTIVE FOR SELECT TO authenticated
      USING ("Key" <> 'hf_config' OR (SELECT public.has_module('storage')));
    INSERT INTO public."SystemConfig" VALUES ('hf_config', '{"token":"hf_xxx"}'), ('other', '{}');

    CREATE TABLE public."StorageRepos" (
      "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "Name" text NOT NULL, "RepoId" text NOT NULL UNIQUE, "Folder" text, "Kind" text NOT NULL);
    CREATE TABLE public."OfficialDocuments" ("Id" serial PRIMARY KEY, "DocNumber" text, "Files" jsonb NOT NULL DEFAULT '[]'::jsonb);
    CREATE TABLE public."Dispatches" ("Id" bigserial PRIMARY KEY, "RepoId" text);

    INSERT INTO auth.users (id) VALUES ('${ID.master}'), ('${ID.user}');
    INSERT INTO public."UserRoles" VALUES ('${ID.master}', 'master_admin'), ('${ID.user}', 'user');
    INSERT INTO public."StorageRepos" ("Name", "RepoId", "Folder", "Kind") VALUES ('Văn thư', 'Ying91/van-thu-tin-dung', 'van-thu', 'dispatch'), ('Kho chung', 'Ying91/cm-kho-chung', NULL, 'shared');
    INSERT INTO public."OfficialDocuments" ("DocNumber", "Files") VALUES ('A', '[{"kind":"goc","repoId":"Ying91/van-thu-tin-dung","path":"a/1.pdf","name":"1.pdf","fileId":"F1"}]');
  `);
  await db.exec(M67);
  await db.exec(M68);
  await db.exec(M69);
  await db.exec(`
    UPDATE public."StorageRepos" SET "Provider" = 'drive', "LegacyRepoId" = "RepoId", "RepoId" = '${ROOT_A}' WHERE "Id" = 1;
    UPDATE public."StorageRepos" SET "Provider" = 'drive', "LegacyRepoId" = "RepoId", "RepoId" = '${ROOT_B}' WHERE "Id" = 2;
    UPDATE public."OfficialDocuments" SET "Files" = jsonb_set("Files", '{0,repoId}', to_jsonb('${ROOT_A}'::text));
  `);
  await db.exec(M70);
  return db;
}

async function actAs(db: PGlite, who: 'master' | 'user') {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [ID[who]]);
  await db.exec('SET ROLE authenticated');
}

const cols = async (db: PGlite) =>
  (await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name = 'StorageRepos' ORDER BY ordinal_position`)).rows.map((r) => r.column_name);
const update = (db: PGlite, id: number, name: string, repoId: string) =>
  db.query<{ r: { documents: number; dispatches: number } }>(`SELECT public.update_storage_repo($1::bigint, $2, $3) AS r`, [id, name, repoId]);

describe('migration 70: dọn Hugging Face khỏi CSDL', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('xóa token Hugging Face và chính sách riêng của nó; khóa cấu hình khác còn nguyên', async () => {
    await db.exec('RESET ROLE');
    expect((await db.query<{ Key: string }>(`SELECT "Key" FROM public."SystemConfig"`)).rows.map((r) => r.Key)).toEqual(['other']);
    expect((await db.query(`SELECT 1 FROM pg_policies WHERE policyname = 'mod_hf_config'`)).rows).toHaveLength(0);
  });

  it('token không bị chép sang bảng sao lưu', async () => {
    await db.exec('RESET ROLE');
    const text = JSON.stringify((await db.query(`SELECT * FROM public."StorageRepos_backup_20261008"`)).rows);
    expect(text).not.toContain('hf_xxx');
  });

  it('sao lưu giữ nguyên tên repo Hugging Face cũ, thư mục gốc và nhà cung cấp trước khi bỏ cột', async () => {
    await db.exec('RESET ROLE');
    const { rows } = await db.query<{ Id: number; Provider: string; Folder: string | null; LegacyRepoId: string }>(
      `SELECT "Id", "Provider", "Folder", "LegacyRepoId" FROM public."StorageRepos_backup_20261008" ORDER BY "Id"`);
    expect(rows).toEqual([
      { Id: 1, Provider: 'drive', Folder: 'van-thu', LegacyRepoId: 'Ying91/van-thu-tin-dung' },
      { Id: 2, Provider: 'drive', Folder: null, LegacyRepoId: 'Ying91/cm-kho-chung' },
    ]);
  });

  it('bảng sao lưu bị khóa: tài khoản đăng nhập không đọc được', async () => {
    await actAs(db, 'master');
    await expect(db.query(`SELECT * FROM public."StorageRepos_backup_20261008"`)).rejects.toThrow(/permission denied/);
  });

  it('bảng repo chỉ còn các cột cần thiết, dữ liệu repo giữ nguyên', async () => {
    await db.exec('RESET ROLE');
    expect(await cols(db)).not.toEqual(expect.arrayContaining(['Provider']));
    expect(await cols(db)).not.toEqual(expect.arrayContaining(['Folder']));
    expect(await cols(db)).not.toEqual(expect.arrayContaining(['LegacyRepoId']));
    expect((await db.query<{ RepoId: string }>(`SELECT "RepoId" FROM public."StorageRepos" ORDER BY "Id"`)).rows.map((r) => r.RepoId)).toEqual([ROOT_A, ROOT_B]);
  });

  it('hàm chuyển repo sang Drive và hàm sửa repo 4 tham số đã bị bỏ', async () => {
    await db.exec('RESET ROLE');
    const { rows } = await db.query<{ proname: string; n: number }>(
      `SELECT proname, pronargs::int AS n FROM pg_proc WHERE proname IN ('switch_storage_repo_to_drive', 'update_storage_repo')`);
    expect(rows).toEqual([{ proname: 'update_storage_repo', n: 3 }]);
  });

  it('Master Admin đổi tên và đổi ID thư mục: trỏ lại tệp của văn bản trong cùng giao dịch', async () => {
    await actAs(db, 'master');
    expect((await update(db, 2, 'Kho dùng chung', ROOT_B)).rows[0].r).toEqual({ documents: 0, dispatches: 0 });
    const newId = '1MoiAbCdEfGhIjKlMnOpQrStUvWx';
    expect((await update(db, 1, 'Văn thư', newId)).rows[0].r.documents).toBe(1);
    await db.exec('RESET ROLE');
    const files = (await db.query<{ Files: Array<{ repoId: string; fileId: string }> }>(`SELECT "Files" FROM public."OfficialDocuments"`)).rows[0].Files;
    expect(files[0]).toMatchObject({ repoId: newId, fileId: 'F1' });
  });

  it('ID không phải thư mục Drive, trùng repo khác hoặc không phải Master Admin thì bị từ chối', async () => {
    await actAs(db, 'master');
    await expect(update(db, 2, 'Kho chung', 'Ying91/cm-kho-chung')).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(update(db, 2, 'Kho chung', 'ngan')).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(update(db, 2, 'Kho chung', '1MoiAbCdEfGhIjKlMnOpQrStUvWx')).rejects.toThrow(/đã được repo khác dùng/);
    await expect(update(db, 2, '  ', ROOT_B)).rejects.toThrow(/tên hiển thị/);
    await actAs(db, 'user');
    await expect(update(db, 2, 'X', ROOT_B)).rejects.toThrow(/Chỉ Master Admin/);
  });

  it('chạy lại migration không lỗi (idempotent) và không đổi dữ liệu repo', async () => {
    await db.exec('RESET ROLE');
    const before = (await db.query(`SELECT * FROM public."StorageRepos" ORDER BY "Id"`)).rows;
    await expect(db.exec(M70)).resolves.toBeDefined();
    expect((await db.query(`SELECT * FROM public."StorageRepos" ORDER BY "Id"`)).rows).toEqual(before);
  });

  it('gỡ lại: các cột trở về với giá trị từ bản sao lưu', async () => {
    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    const { rows } = await db.query<{ Id: number; Provider: string; Folder: string | null; LegacyRepoId: string }>(
      `SELECT "Id", "Provider", "Folder", "LegacyRepoId" FROM public."StorageRepos" ORDER BY "Id"`);
    expect(rows).toEqual([
      { Id: 1, Provider: 'drive', Folder: 'van-thu', LegacyRepoId: 'Ying91/van-thu-tin-dung' },
      { Id: 2, Provider: 'drive', Folder: null, LegacyRepoId: 'Ying91/cm-kho-chung' },
    ]);
  });
});
