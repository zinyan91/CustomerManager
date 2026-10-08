// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MIGRATION = read('supabase/migrations/71_bao_cao_cung_sua.sql');
const ROLLBACK = read('supabase/rollbacks/71_bao_cao_cung_sua_rollback.sql');

const ID = {
  master: '00000000-0000-0000-0000-000000000001',
  owner: '00000000-0000-0000-0000-000000000002',
  editor: '00000000-0000-0000-0000-000000000003',
  viewer: '00000000-0000-0000-0000-000000000004',
  stranger: '00000000-0000-0000-0000-000000000005',
  unassigned: '00000000-0000-0000-0000-000000000006',
} as const;
type Who = keyof typeof ID;

async function buildDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;

    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY REFERENCES auth.users(id), "Role" text, "FullName" text);
    GRANT SELECT ON public."UserRoles" TO authenticated;
    CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = auth.uid() AND "Role" = 'master_admin') $$;
    -- Module "tools" bật mặc định; test đặt test.tools_off = 'on' để tắt.
    CREATE FUNCTION public.has_module(m text) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT auth.uid() IS NOT NULL AND coalesce(current_setting('test.tools_off', true), '') <> 'on' $$;

    INSERT INTO auth.users (id, email) VALUES
      ('${ID.master}', 'm@x'), ('${ID.owner}', 'o@x'), ('${ID.editor}', 'e@x'), ('${ID.viewer}', 'v@x'), ('${ID.stranger}', 's@x'), ('${ID.unassigned}', 'u@x');
    INSERT INTO public."UserRoles" ("UserId", "Role", "FullName") VALUES
      ('${ID.master}', 'master_admin', 'Quản trị'), ('${ID.owner}', 'user', 'Chủ Sổ'), ('${ID.editor}', 'user', 'Người Sửa'),
      ('${ID.viewer}', 'user', 'Người Xem'), ('${ID.stranger}', 'user', 'Người Lạ'), ('${ID.unassigned}', NULL, 'Chưa Vai Trò');
  `);
  await db.exec(MIGRATION);
  return db;
}

async function as(db: PGlite, who: Who | 'anon', toolsOff = false) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false), set_config('test.tools_off', $2, false)`, [who === 'anon' ? '' : ID[who], toolsOff ? 'on' : '']);
  await db.exec(who === 'anon' ? 'SET ROLE anon' : 'SET ROLE authenticated');
}

const DATA = { sheets: [{ name: 'Sheet1' }], note: 'v1' };

async function create(db: PGlite, who: Who = 'owner', data: unknown = DATA): Promise<string> {
  await as(db, who);
  return (await db.query<{ id: string }>(`SELECT public.office_create_document('Sổ cái', $1::jsonb) AS id`, [JSON.stringify(data)])).rows[0].id;
}
const save = (db: PGlite, doc: string, seq: number, title: string, data: unknown) =>
  db.query<{ s: string }>(`SELECT public.office_save_document($1, $2::bigint, $3, $4::jsonb) AS s`, [doc, seq, title, JSON.stringify(data)]);
const share = (db: PGlite, doc: string, user: Who, role: string | null) =>
  db.query(`SELECT public.office_set_member($1, $2, $3)`, [doc, ID[user], role]);
const get = (db: PGlite, doc: string) => db.query<{ id: string; title: string; data: { note: string }; role: string; last_seq: string }>(`SELECT * FROM public.office_get_document($1)`, [doc]);
const listed = async (db: PGlite) => (await db.query<{ id: string; role: string; owner_name: string }>(`SELECT * FROM public.office_list_documents()`)).rows;

describe('migration 71: tài liệu Báo cáo dùng chung', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('đưa nháp lên: người gọi là chủ, số thứ tự bắt đầu ở 1, tên cắt ở 200 ký tự', async () => {
    const id = await create(db);
    const row = (await get(db, id)).rows[0];
    expect(row).toMatchObject({ title: 'Sổ cái', role: 'owner', data: DATA });
    expect(Number(row.last_seq)).toBe(1);
    const long = (await db.query<{ id: string }>(`SELECT public.office_create_document($1, $2::jsonb) AS id`, ['x'.repeat(300), '{}'])).rows[0].id;
    expect((await get(db, long)).rows[0].title).toHaveLength(200);
  });

  it('người ngoài không thấy và không mở được; người chưa đăng nhập không gọi được hàm nào', async () => {
    const id = await create(db);
    await as(db, 'stranger');
    expect((await listed(db)).map((d) => d.id)).not.toContain(id);
    await expect(get(db, id)).rejects.toThrow(/không có quyền xem/);
    await expect(save(db, id, 1, 'x', DATA)).rejects.toThrow(/không có quyền/);
    await as(db, 'anon');
    await expect(db.query(`SELECT * FROM public.office_list_documents()`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`SELECT public.office_create_document('x', '{}'::jsonb)`)).rejects.toThrow(/permission denied/);
  });

  it('mời người sửa và người xem: cả hai thấy tài liệu với đúng quyền; người sửa lưu được, người xem không', async () => {
    const id = await create(db);
    await share(db, id, 'editor', 'editor');
    await share(db, id, 'viewer', 'viewer');
    await as(db, 'editor');
    expect((await get(db, id)).rows[0].role).toBe('editor');
    expect((await listed(db)).find((d) => d.id === id)).toMatchObject({ role: 'editor', owner_name: 'Chủ Sổ' });
    expect(Number((await save(db, id, 1, 'Sổ cái v2', { ...DATA, note: 'v2' })).rows[0].s)).toBe(2);
    await as(db, 'viewer');
    expect((await get(db, id)).rows[0]).toMatchObject({ role: 'viewer', data: { note: 'v2' }, title: 'Sổ cái v2' });
    await expect(save(db, id, 2, 'x', DATA)).rejects.toThrow(/chỉ có quyền xem/);
  });

  it('khóa lạc quan: lưu với số thứ tự cũ bị báo xung đột (40001), không ghi đè bản của người trước', async () => {
    const id = await create(db);
    await share(db, id, 'editor', 'editor');
    await as(db, 'editor');
    await save(db, id, 1, 'Của người sửa', { ...DATA, note: 'editor' });
    await as(db, 'owner');
    await expect(save(db, id, 1, 'Của chủ', { ...DATA, note: 'owner' })).rejects.toMatchObject({ code: '40001' });
    const row = (await get(db, id)).rows[0];
    expect(row).toMatchObject({ title: 'Của người sửa', data: { note: 'editor' } });
    expect(Number((await save(db, id, Number(row.last_seq), 'Của chủ', { ...DATA, note: 'owner' })).rows[0].s)).toBe(3);
  });

  it('Master Admin đọc và quản lý chia sẻ được nhưng không sửa nội dung', async () => {
    const id = await create(db);
    await as(db, 'master');
    expect((await get(db, id)).rows[0].role).toBe('admin');
    expect((await listed(db)).map((d) => d.id)).toContain(id);
    await share(db, id, 'viewer', 'viewer');
    await expect(save(db, id, 1, 'x', DATA)).rejects.toThrow(/chỉ có quyền xem/);
  });

  it('chỉ chủ hoặc Master Admin đổi chia sẻ, xem danh sách thành viên, xóa tài liệu', async () => {
    const id = await create(db);
    await share(db, id, 'editor', 'editor');
    await as(db, 'editor');
    await expect(share(db, id, 'stranger', 'viewer')).rejects.toThrow(/Chỉ chủ tài liệu/);
    await expect(db.query(`SELECT * FROM public.office_list_members($1)`, [id])).rejects.toThrow(/Chỉ chủ tài liệu/);
    await expect(db.query(`SELECT public.office_delete_document($1)`, [id])).rejects.toThrow(/Chỉ chủ tài liệu/);
    await as(db, 'stranger');
    await expect(db.query(`SELECT * FROM public.office_list_members($1)`, [id])).rejects.toThrow(/Chỉ chủ tài liệu/);
    await as(db, 'owner');
    const members = (await db.query<{ user_id: string; full_name: string; role: string }>(`SELECT * FROM public.office_list_members($1)`, [id])).rows;
    expect(members).toEqual([{ user_id: ID.editor, full_name: 'Người Sửa', role: 'editor' }]);
  });

  it('đổi quyền, gỡ thành viên: gỡ rồi người đó không còn thấy tài liệu', async () => {
    const id = await create(db);
    await share(db, id, 'viewer', 'viewer');
    await share(db, id, 'viewer', 'editor');
    await as(db, 'viewer');
    expect((await get(db, id)).rows[0].role).toBe('editor');
    await as(db, 'owner');
    await share(db, id, 'viewer', null);
    await as(db, 'viewer');
    expect((await listed(db)).map((d) => d.id)).not.toContain(id);
    await expect(get(db, id)).rejects.toThrow(/không có quyền xem/);
  });

  it('không mời được: chính chủ, quyền lạ, tài khoản chưa có vai trò hoặc không tồn tại', async () => {
    const id = await create(db);
    await expect(share(db, id, 'owner', 'editor')).rejects.toThrow(/luôn có quyền sửa/);
    await expect(share(db, id, 'editor', 'owner')).rejects.toThrow(/chỉ có "sửa" hoặc "xem"/);
    await expect(share(db, id, 'unassigned', 'editor')).rejects.toThrow(/Không tìm thấy tài khoản/);
    await expect(db.query(`SELECT public.office_set_member($1, gen_random_uuid(), 'viewer')`, [id])).rejects.toThrow(/Không tìm thấy tài khoản/);
  });

  it('danh sách có thể mời: chỉ mã và họ tên, không gồm chính mình hay tài khoản chưa gán vai trò, không có email', async () => {
    await as(db, 'owner');
    const { rows, fields } = await db.query<{ id: string; full_name: string }>(`SELECT * FROM public.office_invitable_users()`);
    expect(fields.map((f) => f.name)).toEqual(['id', 'full_name']);
    expect(rows.map((r) => r.id).sort()).toEqual([ID.master, ID.editor, ID.viewer, ID.stranger].sort());
    expect(JSON.stringify(rows)).not.toContain('@x');
  });

  it('xóa tài liệu kéo theo thành viên; Master Admin cũng xóa được', async () => {
    const a = await create(db);
    await share(db, a, 'editor', 'editor');
    await db.query(`SELECT public.office_delete_document($1)`, [a]);
    await db.exec('RESET ROLE');
    expect((await db.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Id" = $1`, [a])).rows).toHaveLength(0);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocumentMembers" WHERE "DocId" = $1`, [a])).rows).toHaveLength(0);
    const b = await create(db);
    await as(db, 'master');
    await db.query(`SELECT public.office_delete_document($1)`, [b]);
    await db.exec('RESET ROLE');
    expect((await db.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Id" = $1`, [b])).rows).toHaveLength(0);
  });

  it('nội dung quá 5 MB hoặc không phải đối tượng bị từ chối, cả khi tạo lẫn khi lưu', async () => {
    const big = { pad: 'x'.repeat(5 * 1024 * 1024 + 10) };
    await as(db, 'owner');
    await expect(db.query(`SELECT public.office_create_document('x', $1::jsonb)`, [JSON.stringify(big)])).rejects.toThrow(/lớn hơn 5 MB/);
    await expect(db.query(`SELECT public.office_create_document('x', '[1,2]'::jsonb)`)).rejects.toThrow(/không hợp lệ/);
    const id = await create(db);
    await expect(save(db, id, 1, 'x', big)).rejects.toThrow(/lớn hơn 5 MB/);
    expect(Number((await get(db, id)).rows[0].last_seq)).toBe(1);
  });

  it('tắt module Công cụ tính của tài khoản thì mọi hàm đều từ chối, kể cả chủ tài liệu', async () => {
    const id = await create(db);
    await as(db, 'owner', true);
    await expect(get(db, id)).rejects.toThrow(/không có quyền dùng tab Báo cáo/);
    await expect(db.query(`SELECT * FROM public.office_list_documents()`)).rejects.toThrow(/không có quyền dùng tab Báo cáo/);
    expect((await db.query(`SELECT count(*)::int AS n FROM public."OfficeDocuments"`)).rows[0]).toEqual({ n: 0 });
  });

  it('ghi thẳng vào bảng bị chặn với mọi tài khoản đăng nhập; đọc thẳng chỉ thấy tài liệu có quyền', async () => {
    const id = await create(db);
    await expect(db.query(`INSERT INTO public."OfficeDocuments" ("OwnerId", "Data") VALUES ($1, '{}')`, [ID.owner])).rejects.toThrow(/permission denied/);
    await expect(db.query(`UPDATE public."OfficeDocuments" SET "Title" = 'hack' WHERE "Id" = $1`, [id])).rejects.toThrow(/permission denied/);
    await expect(db.query(`DELETE FROM public."OfficeDocumentMembers"`)).rejects.toThrow(/permission denied/);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Id" = $1`, [id])).rows).toHaveLength(1);
    await as(db, 'stranger');
    expect((await db.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Id" = $1`, [id])).rows).toHaveLength(0);
  });

  it('chạy lại migration không lỗi và không mất dữ liệu; rollback gỡ sạch bảng và hàm', async () => {
    const id = await create(db);
    await db.exec('RESET ROLE');
    await db.exec(MIGRATION);
    expect((await db.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Id" = $1`, [id])).rows).toHaveLength(1);
    expect((await db.query(`SELECT 1 FROM pg_proc WHERE proname LIKE 'office\_%'`)).rows.length).toBeGreaterThan(8);
    await db.exec(ROLLBACK);
    expect((await db.query(`SELECT 1 FROM pg_tables WHERE tablename LIKE 'OfficeDocument%'`)).rows).toHaveLength(0);
    expect((await db.query(`SELECT 1 FROM pg_proc WHERE proname LIKE 'office\\_%'`)).rows).toHaveLength(0);
  });
});
