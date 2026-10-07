// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M67 = read('supabase/migrations/67_sua_repo_kho_luu_tru.sql');
const M68 = read('supabase/migrations/68_kho_luu_tru_google_drive.sql');
const ROLLBACK = read('supabase/rollbacks/68_kho_luu_tru_google_drive_rollback.sql');

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  user: '00000000-0000-0000-0000-000000000003',
};
const DRIVE_FOLDER = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

async function buildDb(withMigration68 = true): Promise<PGlite> {
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

    INSERT INTO auth.users (id) VALUES ('${ID.master}'), ('${ID.user}');
    INSERT INTO public."UserRoles" VALUES ('${ID.master}', 'master_admin'), ('${ID.user}', 'user');
    INSERT INTO public."StorageRepos" ("Name", "RepoId", "Folder", "Kind") VALUES
      ('Văn thư', 'Ying91/van-thu-tin-dung', NULL, 'dispatch'),
      ('Kho chung', 'Ying91/cm-kho-chung', NULL, 'shared');
    INSERT INTO public."OfficialDocuments" ("DocNumber", "Files") VALUES
      ('A', '[{"kind":"goc","repoId":"Ying91/van-thu-tin-dung","path":"a/1.pdf","name":"1.pdf"}]');
  `);
  await db.exec(M67);
  if (withMigration68) await db.exec(M68);
  return db;
}

async function actAs(db: PGlite, who: 'master' | 'user') {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [ID[who]]);
  await db.exec('SET ROLE authenticated');
}

const update = (db: PGlite, id: number, name: string, repoId: string, folder: string | null) =>
  db.query(`SELECT public.update_storage_repo($1::bigint, $2, $3, $4) AS r`, [id, name, repoId, folder]);
const repos = async (db: PGlite) =>
  (await db.query<{ Id: number; Name: string; RepoId: string; Provider: string; LegacyRepoId: string | null }>(
    `SELECT "Id", "Name", "RepoId", "Provider", "LegacyRepoId" FROM public."StorageRepos" ORDER BY "Id"`)).rows;

describe('migration 68: nhà cung cấp lưu trữ của repo', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('repo hiện có mặc định là huggingface, chưa có repo cũ nào', async () => {
    expect((await repos(db)).map((r) => [r.Provider, r.LegacyRepoId])).toEqual([['huggingface', null], ['huggingface', null]]);
  });

  it('chạy lại migration không lỗi (idempotent) và không đổi dữ liệu', async () => {
    const before = await repos(db);
    await db.exec('RESET ROLE');
    await expect(db.exec(M68)).resolves.toBeDefined();
    expect(await repos(db)).toEqual(before);
  });

  it('Provider chỉ nhận huggingface hoặc drive', async () => {
    await db.exec('RESET ROLE');
    await expect(db.exec(`UPDATE public."StorageRepos" SET "Provider" = 'dropbox' WHERE "Id" = 2`)).rejects.toThrow(/StorageRepos_Provider_check/);
    await expect(
      db.exec(`INSERT INTO public."StorageRepos" ("Name", "RepoId", "Kind", "Provider") VALUES ('K', 'x', 'shared', 'drive')`),
    ).resolves.toBeDefined();
    await db.exec(`DELETE FROM public."StorageRepos" WHERE "RepoId" = 'x'`);
  });

  it('repo Hugging Face vẫn kiểm Repository ID dạng owner/ten-repo và vẫn cập nhật tham chiếu văn bản như migration 67', async () => {
    await actAs(db, 'master');
    await expect(update(db, 1, 'Văn thư', '1AbCdEfGhIjKlMnOpQr', null)).rejects.toThrow(/owner\/ten-repo/);
    const { rows } = await update(db, 1, 'Văn thư', 'Ying91/van-thu-2', null);
    expect((rows[0] as { r: { documents: number } }).r.documents).toBe(1);
    await db.exec('RESET ROLE');
    expect((await db.query<{ Files: Array<{ repoId: string }> }>(`SELECT "Files" FROM public."OfficialDocuments"`)).rows[0].Files[0].repoId).toBe('Ying91/van-thu-2');
  });

  it('repo Drive: nhận ID thư mục Drive, từ chối dạng owner/ten-repo và ID ngắn hay có ký tự lạ', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`UPDATE public."StorageRepos" SET "Provider" = 'drive', "RepoId" = '${DRIVE_FOLDER}' WHERE "Id" = 2`);
    await actAs(db, 'master');
    await expect(update(db, 2, 'Kho chung', 'Ying91/cm-kho-chung', null)).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(update(db, 2, 'Kho chung', 'ngan', null)).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(update(db, 2, 'Kho chung', 'co dau cach 1234567', null)).rejects.toThrow(/ID thư mục Google Drive/);
    const other = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765';
    await expect(update(db, 2, 'Kho chung mới', other, '/a/')).resolves.toBeDefined();
    await db.exec('RESET ROLE');
    expect((await repos(db))[1]).toMatchObject({ Name: 'Kho chung mới', RepoId: other, Provider: 'drive' });
  });

  it('User thường vẫn không sửa được repo Drive', async () => {
    await actAs(db, 'user');
    await expect(update(db, 2, 'X', '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765', null)).rejects.toThrow(/Chỉ Master Admin/);
  });
});

describe('tập lệnh gỡ migration 68', () => {
  it('từ chối khi còn repo Drive, không đổi gì', async () => {
    const db = await buildDb();
    await db.exec(`UPDATE public."StorageRepos" SET "Provider" = 'drive', "RepoId" = '${DRIVE_FOLDER}' WHERE "Id" = 2`);
    await expect(db.exec(ROLLBACK)).rejects.toThrow(/Còn repo dùng Google Drive/);
    expect((await repos(db))[1].Provider).toBe('drive');
    await db.close();
  }, 120_000);

  it('khi không còn repo Drive: bỏ hai cột và trả hàm về bản của migration 67', async () => {
    const db = await buildDb();
    await db.exec(ROLLBACK);
    const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'StorageRepos' AND column_name IN ('Provider', 'LegacyRepoId')`);
    expect(cols.rows).toEqual([]);
    await actAs(db, 'master');
    await expect(update(db, 2, 'Kho chung', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', null)).rejects.toThrow(/owner\/ten-repo/);
    await expect(update(db, 2, 'Kho chung', 'Ying91/cm-kho-chung-2', null)).resolves.toBeDefined();
    await db.close();
  }, 120_000);
});
