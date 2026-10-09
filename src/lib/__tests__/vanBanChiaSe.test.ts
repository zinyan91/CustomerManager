// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MIGRATIONS = [
  '71_bao_cao_cung_sua.sql',
  '72_bao_cao_nhat_ky_thao_tac.sql',
  '73_bao_cao_lich_su_va_doi_ten.sql',
  '74_van_ban_chia_se.sql',
].map((name) => read(`supabase/migrations/${name}`));
const M74 = MIGRATIONS[3];
const ROLLBACK = read('supabase/rollbacks/74_van_ban_chia_se_rollback.sql');

const ID = {
  owner: '00000000-0000-0000-0000-000000000002',
  editor: '00000000-0000-0000-0000-000000000003',
  viewer: '00000000-0000-0000-0000-000000000004',
  stranger: '00000000-0000-0000-0000-000000000005',
  master: '00000000-0000-0000-0000-000000000001',
} as const;
type Who = keyof typeof ID;

async function buildDb(upTo = MIGRATIONS.length): Promise<PGlite> {
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
  for (const sql of MIGRATIONS.slice(0, upTo)) await db.exec(sql);
  return db;
}

async function as(db: PGlite, who: Who | 'anon') {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [who === 'anon' ? '' : ID[who]]);
  await db.exec(who === 'anon' ? 'SET ROLE anon' : 'SET ROLE authenticated');
}

const body = (note: string) => ({ type: 'doc', note });
const create = async (db: PGlite, kind?: string): Promise<string> => {
  await as(db, 'owner');
  const id = (
    kind === undefined
      ? await db.query<{ id: string }>(`SELECT public.office_create_document('Tài liệu', $1::jsonb) AS id`, [JSON.stringify(body('v1'))])
      : await db.query<{ id: string }>(`SELECT public.office_create_document('Tài liệu', $1::jsonb, $2) AS id`, [JSON.stringify(body('v1')), kind])
  ).rows[0].id;
  await db.query(`SELECT public.office_set_member($1, $2, 'editor')`, [id, ID.editor]);
  await db.query(`SELECT public.office_set_member($1, $2, 'viewer')`, [id, ID.viewer]);
  return id;
};
const save = (db: PGlite, id: string, base: number, title: string, note: string) =>
  db.query<{ s: string }>(`SELECT public.office_save_document($1, $2::bigint, $3, $4::jsonb) AS s`, [id, base, title, JSON.stringify(body(note))]);
const getDoc = async (db: PGlite, id: string) =>
  (await db.query<{ title: string; data: { note: string }; last_seq: string; kind: string }>(`SELECT * FROM public.office_get_document($1)`, [id])).rows[0];
const lastOp = async (db: PGlite, id: string, after: number) =>
  (await db.query<{ seq: string; patch: unknown; summary: unknown }>(`SELECT * FROM public.office_list_ops($1, $2::bigint)`, [id, after])).rows;

describe('migration 74: chia sẻ Văn bản', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await buildDb();
  }, 120_000);
  afterAll(async () => {
    await db.close();
  });

  it('tạo văn bản: loại được ghi, danh sách và mở trả kind; không nêu loại thì là bảng tính; loại lạ bị từ chối', async () => {
    const writer = await create(db, 'writer');
    const calc = await create(db);
    await as(db, 'owner');
    const list = (await db.query<{ id: string; kind: string }>(`SELECT id, kind FROM public.office_list_documents()`)).rows;
    expect(list.find((d) => d.id === writer)?.kind).toBe('writer');
    expect(list.find((d) => d.id === calc)?.kind).toBe('calc');
    expect((await getDoc(db, writer)).kind).toBe('writer');
    await expect(create(db, 'slides')).rejects.toThrow(/Loại tài liệu không hợp lệ/);
    await as(db, 'anon');
    await expect(db.query(`SELECT public.office_create_document('x', '{}'::jsonb, 'writer')`)).rejects.toThrow();
  });

  it('lưu văn bản: đúng số thứ tự thì ghi nhật ký loại save, lệch thì lỗi xung đột và không đổi gì', async () => {
    const id = await create(db, 'writer');
    await as(db, 'editor');
    expect(Number((await save(db, id, 1, 'Tên mới', 'v2')).rows[0].s)).toBe(2);
    const doc = await getDoc(db, id);
    expect([doc.title, doc.data.note, Number(doc.last_seq)]).toEqual(['Tên mới', 'v2', 2]);
    expect(await lastOp(db, id, 1)).toEqual([expect.objectContaining({ patch: [{ t: 'reset' }], summary: { kind: 'save' } })]);

    await as(db, 'owner');
    await expect(save(db, id, 1, 'Của chủ', 'v3')).rejects.toThrow(/Người khác đã lưu/);
    const after = await getDoc(db, id);
    expect([after.data.note, Number(after.last_seq)]).toEqual(['v2', 2]);
  });

  it('người chỉ xem và người ngoài không lưu được; bảng tính vẫn ghi nhật ký loại reset như trước', async () => {
    const id = await create(db, 'writer');
    await as(db, 'viewer');
    await expect(save(db, id, 1, 'x', 'v')).rejects.toThrow(/chỉ có quyền xem/);
    await as(db, 'stranger');
    await expect(save(db, id, 1, 'x', 'v')).rejects.toThrow(/không có quyền/);

    const calc = await create(db);
    await as(db, 'owner');
    await save(db, calc, 1, 'Bảng', 'v2');
    expect(await lastOp(db, calc, 1)).toEqual([expect.objectContaining({ summary: { kind: 'reset' } })]);
  });

  it('mốc, khôi phục và đổi tên dùng được trên văn bản', async () => {
    const id = await create(db, 'writer');
    await as(db, 'owner');
    await save(db, id, 1, 'Bản đầu', 'một');
    const v = Number((await db.query<{ v: string }>(`SELECT public.office_save_version($1, 2::bigint, 'Mốc', $2::jsonb) AS v`, [id, JSON.stringify(body('một'))])).rows[0].v);
    await save(db, id, 2, 'Bản đầu', 'hai');
    await db.query(`SELECT public.office_restore_version($1, $2::bigint)`, [id, v]);
    await db.query(`SELECT public.office_rename_document($1, 'Tên khác')`, [id]);
    const doc = await getDoc(db, id);
    expect([doc.data.note, doc.title, doc.kind]).toEqual(['một', 'Tên khác', 'writer']);
  });

  it('quá 5 MB: thông điệp nói chung cho tài liệu (không nhắc riêng bảng tính), tạo và lưu đều bị từ chối', async () => {
    await as(db, 'owner');
    await expect(db.query(`SELECT public.office_create_document('Lớn', jsonb_build_object('doc', repeat('x', 5300000)), 'writer')`)).rejects.toThrow(/Tài liệu lớn hơn 5 MB/);
    const id = await create(db, 'writer');
    await as(db, 'owner');
    await expect(db.query(`SELECT public.office_save_document($1, 1::bigint, 'Lớn', jsonb_build_object('doc', repeat('x', 5300000)))`, [id])).rejects.toThrow(/Tài liệu lớn hơn 5 MB/);
    await expect(db.query(`SELECT public.office_create_document('Hỏng', '[]'::jsonb, 'writer')`)).rejects.toThrow(/Nội dung tài liệu không hợp lệ/);
  });

  it('chạy lại migration không làm mất văn bản hay đổi loại', async () => {
    const id = await create(db, 'writer');
    await as(db, 'owner');
    await save(db, id, 1, 'Giữ', 'giữ nguyên');
    await db.exec('RESET ROLE');
    await db.exec(M74);
    await as(db, 'owner');
    const doc = await getDoc(db, id);
    expect([doc.kind, doc.data.note, Number(doc.last_seq)]).toEqual(['writer', 'giữ nguyên', 2]);
  });

  it('gỡ migration: còn văn bản chia sẻ thì thất bại (không xóa dữ liệu); hết văn bản thì về đúng hình dạng cũ', async () => {
    const own = await buildDb();
    try {
      await create(own, 'writer');
      await own.exec('RESET ROLE');
      await expect(own.exec(ROLLBACK)).rejects.toThrow(/violates check constraint|OfficeDocuments_Kind_check/);
      expect((await own.query(`SELECT 1 FROM public."OfficeDocuments" WHERE "Kind" = 'writer'`)).rows).toHaveLength(1);
      await own.exec(`DELETE FROM public."OfficeDocuments" WHERE "Kind" = 'writer'`);
      await own.exec(ROLLBACK);
      await as(own, 'owner');
      const calc = (await own.query<{ id: string }>(`SELECT public.office_create_document('Cũ', '{}'::jsonb) AS id`)).rows[0].id;
      const columns = Object.keys((await own.query(`SELECT * FROM public.office_get_document($1)`, [calc])).rows[0] as object);
      expect(columns).not.toContain('kind');
      await expect(own.query(`SELECT public.office_create_document('Hỏng', '[]'::jsonb)`)).rejects.toThrow(/Nội dung bảng tính không hợp lệ/);
      await expect(own.query(`SELECT public.office_create_document('x', '{}'::jsonb, 'writer')`)).rejects.toThrow();
    } finally {
      await own.close();
    }
  }, 120_000);
});
