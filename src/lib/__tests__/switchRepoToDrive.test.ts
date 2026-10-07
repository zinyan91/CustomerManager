// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M67 = read('supabase/migrations/67_sua_repo_kho_luu_tru.sql');
const M68 = read('supabase/migrations/68_kho_luu_tru_google_drive.sql');
const M69 = read('supabase/migrations/69_chuyen_repo_sang_drive.sql');
const ROLLBACK = read('supabase/rollbacks/69_chuyen_repo_sang_drive_rollback.sql');

const ID = { master: '00000000-0000-0000-0000-000000000001', user: '00000000-0000-0000-0000-000000000003' };
const ROOT = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const OTHER_ROOT = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765';

type FileRef = { kind: string; repoId: string; path: string; name: string; fileId?: string };

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

    INSERT INTO auth.users (id) VALUES ('${ID.master}'), ('${ID.user}');
    INSERT INTO public."UserRoles" VALUES ('${ID.master}', 'master_admin'), ('${ID.user}', 'user');
    INSERT INTO public."StorageRepos" ("Name", "RepoId", "Folder", "Kind") VALUES
      ('Văn thư', 'Ying91/van-thu-tin-dung', 'van-thu', 'dispatch'),
      ('Biểu mẫu', 'Ying91/cm-bieu-mau', NULL, 'form'),
      ('Kho chung', 'Ying91/cm-kho-chung', NULL, 'shared');
  `);
  await db.exec(M67);
  await db.exec(M68);
  await db.exec(M69);
  return db;
}

/** Đặt lại văn bản mẫu: A có tệp gốc + biểu mẫu ở hai repo khác nhau; B có tệp gốc cùng đường dẫn nhưng ở repo khác; C có tệp không có trong danh sách chuyển. */
async function seedDocs(db: PGlite) {
  await db.exec('RESET ROLE');
  await db.exec(`DELETE FROM public."OfficialDocuments"`);
  const docs: Array<[string, FileRef[]]> = [
    ['A', [
      { kind: 'goc', repoId: 'Ying91/van-thu-tin-dung', path: 'van-thu/van-ban/2026/a/1.pdf', name: '1.pdf' },
      { kind: 'bieu-mau', repoId: 'Ying91/cm-bieu-mau', path: 'a/mau.docx', name: 'mau.docx' },
      { kind: 'goc', repoId: 'Ying91/van-thu-tin-dung', path: 'van-thu/van-ban/2026/a/pl1.pdf', name: 'pl1.pdf' },
    ]],
    ['B', [{ kind: 'goc', repoId: 'Ying91/cm-kho-chung', path: 'van-thu/van-ban/2026/a/1.pdf', name: '1.pdf' }]],
    ['C', [{ kind: 'goc', repoId: 'Ying91/van-thu-tin-dung', path: 'van-thu/van-ban/2026/c/da-mat.pdf', name: 'da-mat.pdf' }]],
  ];
  for (const [num, files] of docs) {
    await db.query(`INSERT INTO public."OfficialDocuments" ("DocNumber", "Files") VALUES ($1, $2::jsonb)`, [num, JSON.stringify(files)]);
  }
}

const MAP = [
  { from: 'van-thu/van-ban/2026/a/1.pdf', path: 'van-ban/2026/a/1.pdf', fileId: 'FID-1' },
  { from: 'van-thu/van-ban/2026/a/pl1.pdf', path: 'van-ban/2026/a/pl1.pdf', fileId: 'FID-2' },
];

async function actAs(db: PGlite, who: 'master' | 'user') {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [ID[who]]);
  await db.exec('SET ROLE authenticated');
}
const switchRepo = (db: PGlite, id: number, root: string, files: unknown) =>
  db.query<{ r: { documents: number; files_remapped: number; files_unmapped: number } }>(
    `SELECT public.switch_storage_repo_to_drive($1::bigint, $2, $3::jsonb) AS r`, [id, root, JSON.stringify(files)]);
const repos = async (db: PGlite) => {
  await db.exec('RESET ROLE');
  return (await db.query<{ Id: number; RepoId: string; Provider: string; LegacyRepoId: string | null; Folder: string | null }>(
    `SELECT "Id", "RepoId", "Provider", "LegacyRepoId", "Folder" FROM public."StorageRepos" ORDER BY "Id"`)).rows;
};
const docFiles = async (db: PGlite, num: string) => {
  await db.exec('RESET ROLE');
  return (await db.query<{ Files: FileRef[] }>(`SELECT "Files" FROM public."OfficialDocuments" WHERE "DocNumber" = $1`, [num])).rows[0].Files;
};

describe('migration 69: chuyển repo sang Google Drive', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('chạy lại migration không lỗi (idempotent)', async () => {
    await db.exec('RESET ROLE');
    await expect(db.exec(M69)).resolves.toBeDefined();
  });

  it('chỉ Master Admin chuyển được: User thường và khách chưa đăng nhập bị từ chối, không đổi gì', async () => {
    await seedDocs(db);
    const before = await repos(db);
    await actAs(db, 'user');
    await expect(switchRepo(db, 1, ROOT, MAP)).rejects.toThrow(/Chỉ Master Admin/);
    await db.exec('RESET ROLE');
    await db.exec(`SELECT set_config('request.jwt.claim.sub', '', false)`);
    await db.exec('SET ROLE anon');
    await expect(switchRepo(db, 1, ROOT, MAP)).rejects.toThrow(/permission denied/);
    expect(await repos(db)).toEqual(before);
  });

  it('chuyển repo: đổi nhà cung cấp, giữ repo cũ ở LegacyRepoId và Folder nguyên; tệp của văn bản trỏ lại bằng mã Drive', async () => {
    await seedDocs(db);
    await actAs(db, 'master');
    const { rows } = await switchRepo(db, 1, ROOT, MAP);
    // Chỉ văn bản A có tệp được chuyển; văn bản C chỉ có tệp không có trong danh sách nên không bị sửa
    expect(rows[0].r).toEqual({ documents: 1, files_remapped: 2, files_unmapped: 1 });

    expect((await repos(db))[0]).toEqual({ Id: 1, RepoId: ROOT, Provider: 'drive', LegacyRepoId: 'Ying91/van-thu-tin-dung', Folder: 'van-thu' });
    const a = await docFiles(db, 'A');
    expect(a[0]).toEqual({ kind: 'goc', repoId: ROOT, path: 'van-ban/2026/a/1.pdf', name: '1.pdf', fileId: 'FID-1' });
    expect(a[2]).toEqual({ kind: 'goc', repoId: ROOT, path: 'van-ban/2026/a/pl1.pdf', name: 'pl1.pdf', fileId: 'FID-2' });
  });

  it('giữ nguyên thứ tự tệp, tệp của repo khác và tệp cùng đường dẫn ở repo khác', async () => {
    const a = await docFiles(db, 'A');
    expect(a.map((f) => f.name)).toEqual(['1.pdf', 'mau.docx', 'pl1.pdf']);
    expect(a[1]).toEqual({ kind: 'bieu-mau', repoId: 'Ying91/cm-bieu-mau', path: 'a/mau.docx', name: 'mau.docx' });
    expect(await docFiles(db, 'B')).toEqual([{ kind: 'goc', repoId: 'Ying91/cm-kho-chung', path: 'van-thu/van-ban/2026/a/1.pdf', name: '1.pdf' }]);
  });

  it('tệp không có trong danh sách chuyển thì giữ nguyên tham chiếu cũ (đếm là files_unmapped)', async () => {
    expect(await docFiles(db, 'C')).toEqual([{ kind: 'goc', repoId: 'Ying91/van-thu-tin-dung', path: 'van-thu/van-ban/2026/c/da-mat.pdf', name: 'da-mat.pdf' }]);
  });

  it('repo đã ở Drive thì từ chối chuyển lần nữa', async () => {
    await actAs(db, 'master');
    await expect(switchRepo(db, 1, OTHER_ROOT, MAP)).rejects.toThrow(/đã ở Google Drive/);
  });

  it('từ chối ID thư mục sai dạng, trùng repo khác, repo không tồn tại; không đổi gì', async () => {
    await actAs(db, 'master');
    const before = await repos(db);
    await expect(switchRepo(db, 2, 'Ying91/ten-repo', MAP)).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(switchRepo(db, 2, 'ngan', MAP)).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(switchRepo(db, 2, ROOT, MAP)).rejects.toThrow(/repo khác dùng/);
    await expect(switchRepo(db, 999, OTHER_ROOT, MAP)).rejects.toThrow(/Không tìm thấy repo/);
    expect(await repos(db)).toEqual(before);
  });

  it('danh sách tệp sai (không phải mảng, thiếu trường, trùng nguồn) bị từ chối trước khi đổi gì', async () => {
    await seedDocs(db);
    await actAs(db, 'master');
    const before = await repos(db);
    await expect(switchRepo(db, 2, OTHER_ROOT, { from: 'a' })).rejects.toThrow(/phải là một mảng/);
    await expect(switchRepo(db, 2, OTHER_ROOT, [{ from: 'a/mau.docx', path: 'a/mau.docx' }])).rejects.toThrow(/đủ "from", "path" và "fileId"/);
    await expect(switchRepo(db, 2, OTHER_ROOT, [
      { from: 'a/mau.docx', path: 'a/mau.docx', fileId: 'F1' },
      { from: 'a/mau.docx', path: 'a/khac.docx', fileId: 'F2' },
    ])).rejects.toThrow(/trùng nhau/);
    expect(await repos(db)).toEqual(before);
    expect((await docFiles(db, 'A'))[1].repoId).toBe('Ying91/cm-bieu-mau');
  });

  it('còn dòng Dispatches trỏ tới repo thì từ chối, không đổi gì (bảng này chưa hỗ trợ chuyển)', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`INSERT INTO public."Dispatches" ("RepoId") VALUES ('Ying91/cm-kho-chung')`);
    await actAs(db, 'master');
    await expect(switchRepo(db, 3, OTHER_ROOT, [])).rejects.toThrow(/Còn 1 dòng trong bảng Dispatches/);
    expect((await repos(db))[2].Provider).toBe('huggingface');
    await db.exec('RESET ROLE');
    await db.exec(`DELETE FROM public."Dispatches"`);
  });

  it('danh sách chuyển rỗng: repo vẫn chuyển được nhưng không sửa tham chiếu nào, mọi tệp của văn bản được đếm là chưa chuyển', async () => {
    await actAs(db, 'master');
    const { rows } = await switchRepo(db, 3, OTHER_ROOT, []);
    expect(rows[0].r).toEqual({ documents: 0, files_remapped: 0, files_unmapped: 1 });
    expect((await repos(db))[2]).toMatchObject({ Provider: 'drive', RepoId: OTHER_ROOT, LegacyRepoId: 'Ying91/cm-kho-chung' });
    expect(await docFiles(db, 'B')).toEqual([{ kind: 'goc', repoId: 'Ying91/cm-kho-chung', path: 'van-thu/van-ban/2026/a/1.pdf', name: '1.pdf' }]);
  });

  it('câu lệnh quay lui một repo trả repo về Hugging Face như cũ', async () => {
    await db.exec('RESET ROLE');
    await db.exec(`UPDATE public."StorageRepos" SET "Provider" = 'huggingface', "RepoId" = "LegacyRepoId", "LegacyRepoId" = NULL WHERE "Id" = 1`);
    expect((await repos(db))[0]).toEqual({ Id: 1, RepoId: 'Ying91/van-thu-tin-dung', Provider: 'huggingface', LegacyRepoId: null, Folder: 'van-thu' });
  });
});

describe('tập lệnh gỡ migration 69', () => {
  it('bỏ hàm chuyển nhưng giữ nguyên dữ liệu đã chuyển', async () => {
    const db = await buildDb();
    await seedDocs(db);
    await actAs(db, 'master');
    await switchRepo(db, 1, ROOT, MAP);
    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    const fn = await db.query(`SELECT proname FROM pg_proc WHERE proname = 'switch_storage_repo_to_drive'`);
    expect(fn.rows).toEqual([]);
    expect((await repos(db))[0].Provider).toBe('drive');
    expect((await docFiles(db, 'A'))[0].fileId).toBe('FID-1');
    await db.close();
  }, 120_000);
});
