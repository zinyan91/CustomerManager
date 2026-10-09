// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M71 = read('supabase/migrations/71_bao_cao_cung_sua.sql');
const M72 = read('supabase/migrations/72_bao_cao_nhat_ky_thao_tac.sql');
const M73 = read('supabase/migrations/73_bao_cao_lich_su_va_doi_ten.sql');
const ROLLBACK = read('supabase/rollbacks/73_bao_cao_lich_su_va_doi_ten_rollback.sql');

const ID = {
  owner: '00000000-0000-0000-0000-000000000002',
  editor: '00000000-0000-0000-0000-000000000003',
  viewer: '00000000-0000-0000-0000-000000000004',
  stranger: '00000000-0000-0000-0000-000000000005',
  master: '00000000-0000-0000-0000-000000000001',
} as const;
type Who = keyof typeof ID;

async function buildDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    CREATE PUBLICATION supabase_realtime;
    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id), "Role" text, "FullName" text);
    GRANT SELECT ON public."UserRoles" TO authenticated;
    CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" = 'master_admin') $$;
    CREATE FUNCTION public.has_module(m text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IS NOT NULL $$;
    INSERT INTO auth.users (id) VALUES ('${ID.master}'), ('${ID.owner}'), ('${ID.editor}'), ('${ID.viewer}'), ('${ID.stranger}');
    INSERT INTO public."UserRoles" VALUES
      ('${ID.master}', 'master_admin', 'Quản trị'), ('${ID.owner}', 'user', 'Chủ'), ('${ID.editor}', 'user', 'Sửa'),
      ('${ID.viewer}', 'user', 'Xem'), ('${ID.stranger}', 'user', 'Lạ');
  `);
  await db.exec(M71);
  await db.exec(M72);
  await db.exec(M73);
  return db;
}

async function as(db: PGlite, who: Who | 'anon') {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(who === 'anon' ? 'SET ROLE anon' : 'SET ROLE authenticated');
}

const data = (note: string) => ({ sheets: [{ name: 'Sheet1' }], note });
const PATCH = JSON.stringify([{ t: 'cells', sheet: 'Sheet1', set: [[1, 'x', null]], del: [] }]);

async function create(db: PGlite): Promise<string> {
  await as(db, 'owner');
  const id = (await db.query<{ id: string }>(`SELECT public.office_create_document('Sổ', $1::jsonb) AS id`, [JSON.stringify(data('v1'))])).rows[0].id;
  await db.query(`SELECT public.office_set_member($1, $2, 'editor')`, [id, ID.editor]);
  await db.query(`SELECT public.office_set_member($1, $2, 'viewer')`, [id, ID.viewer]);
  return id;
}
const op = (db: PGlite, id: string) => db.query(`SELECT public.office_append_op($1, 'c', $2::jsonb, '{}'::jsonb)`, [id, PATCH]);
const saveVersion = (db: PGlite, id: string, seq: number, label: string, note: string) =>
  db.query<{ v: string }>(`SELECT public.office_save_version($1, $2::bigint, $3, $4::jsonb) AS v`, [id, seq, label, JSON.stringify(data(note))]);
const versions = async (db: PGlite, id: string) => (await db.query<{ id: string; seq: string; label: string; created_by: string }>(`SELECT * FROM public.office_list_versions($1)`, [id])).rows;
const getDoc = async (db: PGlite, id: string) => (await db.query<{ title: string; data: { note: string }; last_seq: string; snap_seq: string }>(`SELECT * FROM public.office_get_document($1)`, [id])).rows[0];

describe('migration 73: mốc phiên bản, khôi phục, đổi tên', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('lưu mốc: ghi nhãn đã cắt khoảng trắng, người lưu và số thứ tự; danh sách mới nhất trước và không kèm nội dung', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await op(db, id);
    await saveVersion(db, id, 1, '  Bản đầu  ', 'v1');
    await saveVersion(db, id, 2, '', 'v2');
    const list = await versions(db, id);
    expect(list.map((v) => [v.label, Number(v.seq), v.created_by])).toEqual([['', 2, ID.owner], ['Bản đầu', 1, ID.owner]]);
    expect(Object.keys(list[0])).toEqual(['id', 'seq', 'label', 'created_by', 'created_at']);
  });

  it('người sửa lưu và khôi phục được; người xem đọc danh sách nhưng không lưu hay khôi phục; người ngoài không thấy gì', async () => {
    const id = await create(db);
    await as(db, 'editor');
    const v = Number((await saveVersion(db, id, 1, 'Của người sửa', 'v1')).rows[0].v);
    await db.query(`SELECT public.office_restore_version($1, $2::bigint)`, [id, v]);
    await as(db, 'viewer');
    expect(await versions(db, id)).toHaveLength(1);
    await expect(saveVersion(db, id, 1, 'x', 'v')).rejects.toThrow(/không có quyền lưu mốc/);
    await expect(db.query(`SELECT public.office_restore_version($1, $2::bigint)`, [id, v])).rejects.toThrow(/không có quyền khôi phục/);
    await as(db, 'stranger');
    await expect(versions(db, id)).rejects.toThrow(/không có quyền xem/);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentVersions"`)).rows).toHaveLength(0);
    await as(db, 'master');
    expect(await versions(db, id)).toHaveLength(1);
    await expect(db.query(`SELECT public.office_restore_version($1, $2::bigint)`, [id, v])).rejects.toThrow(/không có quyền khôi phục/);
  });

  it('khôi phục: nội dung mốc thành bản hiện hành ở số thứ tự mới, ghi thao tác reset kèm nguồn, KHÔNG xóa mốc hay thao tác nào', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await op(db, id); // seq 2
    const v = Number((await saveVersion(db, id, 2, 'Mốc 2', 'ở mốc')).rows[0].v);
    await op(db, id); // seq 3
    const before = Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM public."OfficeDocumentOps" WHERE "DocId" = $1`, [id])).rows[0].n);
    const seq = Number((await db.query<{ s: string }>(`SELECT public.office_restore_version($1, $2::bigint) AS s`, [id, v])).rows[0].s);
    expect(seq).toBe(4);
    const doc = await getDoc(db, id);
    expect([Number(doc.last_seq), Number(doc.snap_seq), doc.data.note]).toEqual([4, 4, 'ở mốc']);
    const last = (await db.query<{ patch: unknown; summary: unknown }>(`SELECT * FROM public.office_list_ops($1, 3::bigint)`, [id])).rows;
    expect(last).toEqual([{ seq: '4', user_id: ID.owner, client_id: '', patch: [{ t: 'reset' }], summary: { kind: 'reset', restoredFromSeq: 2 }, created_at: expect.anything() }].map((r) => expect.objectContaining({ patch: r.patch, summary: r.summary })));
    const after = Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM public."OfficeDocumentOps" WHERE "DocId" = $1`, [id])).rows[0].n);
    expect(after).toBe(before + 1);
    expect(await versions(db, id)).toHaveLength(1);
  });

  it('mốc không thuộc tài liệu này hoặc không tồn tại thì không khôi phục được; số thứ tự ngoài khoảng bị từ chối', async () => {
    const a = await create(db);
    const b = await create(db);
    await as(db, 'owner');
    const vb = Number((await saveVersion(db, b, 1, 'của b', 'b')).rows[0].v);
    await expect(db.query(`SELECT public.office_restore_version($1, $2::bigint)`, [a, vb])).rejects.toThrow(/Không tìm thấy mốc/);
    await expect(db.query(`SELECT public.office_restore_version($1, 999999::bigint)`, [a])).rejects.toThrow(/Không tìm thấy mốc/);
    await expect(saveVersion(db, a, 99, 'x', 'v')).rejects.toThrow(/không hợp lệ/);
    await expect(saveVersion(db, a, 0, 'x', 'v')).rejects.toThrow(/không hợp lệ/);
  });

  it('tối đa 50 mốc mỗi tài liệu, quá thì báo chứ không tự xóa; nội dung quá 5 MB bị từ chối', async () => {
    const id = await create(db);
    await as(db, 'owner');
    for (let i = 0; i < 50; i += 1) await saveVersion(db, id, 1, `m${i}`, 'v');
    await expect(saveVersion(db, id, 1, 'thứ 51', 'v')).rejects.toThrow(/50 mốc/);
    expect(await versions(db, id)).toHaveLength(50);
    const other = await create(db);
    await as(db, 'owner');
    await expect(db.query(`SELECT public.office_save_version($1, 1::bigint, 'to', $2::jsonb)`, [other, JSON.stringify({ pad: 'x'.repeat(5 * 1024 * 1024 + 10) })])).rejects.toThrow(/lớn hơn 5 MB/);
  });

  it('đổi tên: chủ và người sửa được, ghi một thao tác rename để máy khác cập nhật; người xem và người ngoài thì không; tên được cắt gọn', async () => {
    const id = await create(db);
    await as(db, 'editor');
    const seq = Number((await db.query<{ s: string }>(`SELECT public.office_rename_document($1, '  Quỹ lương T10  ') AS s`, [id])).rows[0].s);
    expect(seq).toBe(2);
    expect((await getDoc(db, id)).title).toBe('Quỹ lương T10');
    const ops = (await db.query<{ patch: unknown; summary: unknown }>(`SELECT * FROM public.office_list_ops($1, 1::bigint)`, [id])).rows;
    expect(ops[0]).toMatchObject({ patch: [], summary: { kind: 'rename', title: 'Quỹ lương T10' } });
    await db.query(`SELECT public.office_rename_document($1, $2)`, [id, 'y'.repeat(300)]);
    expect((await getDoc(db, id)).title).toHaveLength(200);
    await as(db, 'viewer');
    await expect(db.query(`SELECT public.office_rename_document($1, 'x')`, [id])).rejects.toThrow(/không có quyền đổi tên/);
    await as(db, 'stranger');
    await expect(db.query(`SELECT public.office_rename_document($1, 'x')`, [id])).rejects.toThrow(/không có quyền đổi tên/);
    await as(db, 'anon');
    await expect(db.query(`SELECT public.office_rename_document($1, 'x')`, [id])).rejects.toThrow(/permission denied/);
  });

  it('ghi thẳng vào bảng mốc bị chặn; xóa tài liệu kéo theo mốc; chạy lại migration không mất dữ liệu', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await saveVersion(db, id, 1, 'giữ', 'v');
    await expect(db.query(`INSERT INTO public."OfficeDocumentVersions" ("DocId", "Seq", "Data") VALUES ($1, 1, '{}')`, [id])).rejects.toThrow(/permission denied/);
    await expect(db.query(`DELETE FROM public."OfficeDocumentVersions"`)).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
    await db.exec(M73);
    await as(db, 'owner');
    expect(await versions(db, id)).toHaveLength(1);
    await db.query(`SELECT public.office_delete_document($1)`, [id]);
    await db.exec('RESET ROLE');
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentVersions" WHERE "DocId" = $1`, [id])).rows).toHaveLength(0);
  });

  it('rollback gỡ bảng mốc và bốn hàm, giữ nguyên nhật ký và nội dung', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await op(db, id);
    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    expect((await db.query(`SELECT 1 FROM pg_tables WHERE tablename = 'OfficeDocumentVersions'`)).rows).toHaveLength(0);
    expect((await db.query(`SELECT 1 FROM pg_proc WHERE proname IN ('office_save_version', 'office_list_versions', 'office_restore_version', 'office_rename_document')`)).rows).toHaveLength(0);
    await as(db, 'owner');
    expect(Number((await getDoc(db, id)).last_seq)).toBe(2);
  });
});
