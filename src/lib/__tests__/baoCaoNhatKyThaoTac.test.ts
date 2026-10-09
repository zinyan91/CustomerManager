// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const M71 = read('supabase/migrations/71_bao_cao_cung_sua.sql');
const M72 = read('supabase/migrations/72_bao_cao_nhat_ky_thao_tac.sql');
const ROLLBACK = read('supabase/rollbacks/72_bao_cao_nhat_ky_thao_tac_rollback.sql');

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
    CREATE FUNCTION public.has_module(m text) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT auth.uid() IS NOT NULL AND coalesce(current_setting('test.tools_off', true), '') <> 'on' $$;

    INSERT INTO auth.users (id) VALUES ('${ID.master}'), ('${ID.owner}'), ('${ID.editor}'), ('${ID.viewer}'), ('${ID.stranger}');
    INSERT INTO public."UserRoles" VALUES
      ('${ID.master}', 'master_admin', 'Quản trị'), ('${ID.owner}', 'user', 'Chủ'), ('${ID.editor}', 'user', 'Sửa'),
      ('${ID.viewer}', 'user', 'Xem'), ('${ID.stranger}', 'user', 'Lạ');
  `);
  await db.exec(M71);
  return db;
}

async function as(db: PGlite, who: Who | 'anon', toolsOff = false) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false), set_config('test.tools_off', $2, false)`, [who === 'anon' ? '' : ID[who], toolsOff ? 'on' : '']);
  await db.exec(who === 'anon' ? 'SET ROLE anon' : 'SET ROLE authenticated');
}

const DATA = { sheets: [{ name: 'Sheet1' }], note: 'v1' };
const PATCH = [{ t: 'cells', sheet: 'Sheet1', set: [[1, 'x', null]], del: [] }];

async function create(db: PGlite): Promise<string> {
  await as(db, 'owner');
  return (await db.query<{ id: string }>(`SELECT public.office_create_document('Sổ', $1::jsonb) AS id`, [JSON.stringify(DATA)])).rows[0].id;
}
async function share(db: PGlite, doc: string, user: Who, role: 'editor' | 'viewer') {
  await as(db, 'owner');
  await db.query(`SELECT public.office_set_member($1, $2, $3)`, [doc, ID[user], role]);
}
const append = (db: PGlite, doc: string, client = 'A', patch: unknown = PATCH, summary: unknown = { cells: 1 }) =>
  db.query<{ s: string }>(`SELECT public.office_append_op($1, $2, $3::jsonb, $4::jsonb) AS s`, [doc, client, JSON.stringify(patch), JSON.stringify(summary)]);
const ops = async (db: PGlite, doc: string, after = 0) =>
  (await db.query<{ seq: string; client_id: string; patch: unknown; summary: unknown }>(`SELECT * FROM public.office_list_ops($1, $2::bigint)`, [doc, after])).rows;
const getDoc = async (db: PGlite, doc: string) => (await db.query<{ last_seq: string; snap_seq: string; data: { note: string }; role: string }>(`SELECT * FROM public.office_get_document($1)`, [doc])).rows[0];

describe('migration 72: nhật ký thao tác', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
    const old = await create(db); // tài liệu có từ trước migration 72
    await db.exec('RESET ROLE');
    await db.query(`UPDATE public."OfficeDocuments" SET "LastSeq" = 5 WHERE "Id" = $1`, [old]);
    await db.exec(M72);
    (globalThis as { oldDoc?: string }).oldDoc = old;
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('tài liệu có từ trước: bản chụp ứng với số thứ tự hiện tại, bảng nhật ký nằm trong publication Realtime', async () => {
    const old = (globalThis as { oldDoc?: string }).oldDoc!;
    await as(db, 'owner');
    const row = await getDoc(db, old);
    expect(Number(row.last_seq)).toBe(5);
    expect(Number(row.snap_seq)).toBe(5);
    await db.exec('RESET ROLE');
    expect((await db.query(`SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'OfficeDocumentOps'`)).rows).toHaveLength(1);
  });

  it('ghi thao tác: số thứ tự tăng đều từ LastSeq, lưu người gửi, mã máy, thay đổi và tóm tắt; bản chụp không đổi', async () => {
    const id = await create(db);
    await as(db, 'owner');
    expect(Number((await append(db, id, 'máy-A')).rows[0].s)).toBe(2);
    expect(Number((await append(db, id, 'máy-A', [], { kind: 'x' })).rows[0].s)).toBe(3);
    const list = await ops(db, id);
    expect(list.map((o) => Number(o.seq))).toEqual([2, 3]);
    expect(list[0]).toMatchObject({ client_id: 'máy-A', patch: PATCH, summary: { cells: 1 } });
    const row = await getDoc(db, id);
    expect([Number(row.last_seq), Number(row.snap_seq)]).toEqual([3, 1]);
    expect(row.data).toMatchObject({ note: 'v1' });
  });

  it('chỉ lấy các thao tác sau một số thứ tự (tải bù)', async () => {
    const id = await create(db);
    await as(db, 'owner');
    for (let i = 0; i < 4; i += 1) await append(db, id);
    expect((await ops(db, id, 3)).map((o) => Number(o.seq))).toEqual([4, 5]);
    expect(await ops(db, id, 99)).toEqual([]);
  });

  it('người sửa ghi được, người xem và người ngoài thì không; người xem đọc được nhật ký, người ngoài thì không', async () => {
    const id = await create(db);
    await share(db, id, 'editor', 'editor');
    await share(db, id, 'viewer', 'viewer');
    await as(db, 'editor');
    await append(db, id, 'B');
    await as(db, 'viewer');
    await expect(append(db, id)).rejects.toThrow(/chỉ có quyền xem/);
    expect(await ops(db, id)).toHaveLength(1);
    await as(db, 'stranger');
    await expect(append(db, id)).rejects.toThrow(/không có quyền/);
    await expect(ops(db, id)).rejects.toThrow(/không có quyền xem/);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentOps" WHERE "DocId" = $1`, [id])).rows).toHaveLength(0);
    await as(db, 'master');
    await expect(append(db, id)).rejects.toThrow(/chỉ có quyền xem/);
    expect(await ops(db, id)).toHaveLength(1);
  });

  it('thao tác sai: không phải mảng, quá 1 MB, tắt module; người chưa đăng nhập không gọi được', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await expect(append(db, id, 'A', { t: 'cells' })).rejects.toThrow(/không hợp lệ/);
    await expect(append(db, id, 'A', [{ pad: 'x'.repeat(1024 * 1024 + 10) }])).rejects.toThrow(/lớn hơn 1 MB/);
    expect(await ops(db, id)).toEqual([]);
    await as(db, 'owner', true);
    await expect(append(db, id)).rejects.toThrow(/không có quyền dùng tab Báo cáo/);
    await as(db, 'anon');
    await expect(append(db, id)).rejects.toThrow(/permission denied/);
  });

  it('ghi thẳng vào bảng nhật ký bị chặn với tài khoản đăng nhập', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await expect(db.query(`INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "Patch") VALUES ($1, 99, '[]')`, [id])).rejects.toThrow(/permission denied/);
    await expect(db.query(`DELETE FROM public."OfficeDocumentOps"`)).rejects.toThrow(/permission denied/);
  });

  it('bản chụp: chỉ nhận số thứ tự trong (SnapSeq, LastSeq]; cũ hơn hoặc quá LastSeq thì bỏ qua lặng lẽ; người xem không ghi được', async () => {
    const id = await create(db);
    await share(db, id, 'viewer', 'viewer');
    await as(db, 'owner');
    for (let i = 0; i < 3; i += 1) await append(db, id);
    const snap = (seq: number, note: string) => db.query(`SELECT public.office_save_snapshot($1, $2::bigint, $3::jsonb)`, [id, seq, JSON.stringify({ ...DATA, note })]);
    await snap(3, 'ở số 3');
    expect((await getDoc(db, id)).data.note).toBe('ở số 3');
    expect(Number((await getDoc(db, id)).snap_seq)).toBe(3);
    await snap(2, 'cũ hơn');
    await snap(99, 'quá xa');
    await snap(3, 'trùng');
    expect(Number((await getDoc(db, id)).snap_seq)).toBe(3);
    expect((await getDoc(db, id)).data.note).toBe('ở số 3');
    await as(db, 'viewer');
    await expect(snap(4, 'x')).rejects.toThrow(/không có quyền ghi bản chụp/);
  });

  it('lưu cả nội dung (cách của giai đoạn 1) vẫn dùng được: đặt bản chụp, ghi thao tác "reset", báo xung đột khi số cũ', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await append(db, id);
    await expect(db.query(`SELECT public.office_save_document($1, 1::bigint, 'x', $2::jsonb)`, [id, JSON.stringify(DATA)])).rejects.toMatchObject({ code: '40001' });
    const seq = Number((await db.query<{ s: string }>(`SELECT public.office_save_document($1, 2::bigint, 'Mới', $2::jsonb) AS s`, [id, JSON.stringify({ ...DATA, note: 'đã lưu' })])).rows[0].s);
    expect(seq).toBe(3);
    const row = await getDoc(db, id);
    expect([Number(row.last_seq), Number(row.snap_seq), row.data.note]).toEqual([3, 3, 'đã lưu']);
    expect((await ops(db, id, 2)).map((o) => o.patch)).toEqual([[{ t: 'reset' }]]);
  });

  it('xóa tài liệu kéo theo nhật ký; chạy lại migration không lỗi và không mất dữ liệu', async () => {
    const id = await create(db);
    await as(db, 'owner');
    await append(db, id);
    await db.exec('RESET ROLE');
    await db.exec(M72);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentOps" WHERE "DocId" = $1`, [id])).rows).toHaveLength(1);
    await as(db, 'owner');
    const kept = await getDoc(db, id);
    expect([Number(kept.last_seq), Number(kept.snap_seq)]).toEqual([2, 1]); // chạy lại không kéo bản chụp về LastSeq
    await db.query(`SELECT public.office_delete_document($1)`, [id]);
    await db.exec('RESET ROLE');
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentOps" WHERE "DocId" = $1`, [id])).rows).toHaveLength(0);
  });

  it('rollback gỡ bảng nhật ký, hàm mới, cột SnapSeq và đưa hai hàm về bản của migration 71', async () => {
    await db.exec('RESET ROLE');
    await db.exec(ROLLBACK);
    expect((await db.query(`SELECT 1 FROM pg_tables WHERE tablename = 'OfficeDocumentOps'`)).rows).toHaveLength(0);
    expect((await db.query(`SELECT proname FROM pg_proc WHERE proname IN ('office_append_op', 'office_list_ops', 'office_save_snapshot')`)).rows).toHaveLength(0);
    expect((await db.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'OfficeDocuments' AND column_name = 'SnapSeq'`)).rows).toHaveLength(0);
    const id = await create(db);
    await as(db, 'owner');
    const row = (await db.query<{ last_seq: string }>(`SELECT * FROM public.office_get_document($1)`, [id])).rows[0];
    expect(Number(row.last_seq)).toBe(1);
    expect(Number((await db.query<{ s: string }>(`SELECT public.office_save_document($1, 1::bigint, 'x', $2::jsonb) AS s`, [id, JSON.stringify(DATA)])).rows[0].s)).toBe(2);
  });
});
