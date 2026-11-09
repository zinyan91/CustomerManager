import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const as = async (role: 'authenticated' | 'anon', sql: string) => {
  await db.exec(`SET ROLE ${role}`);
  try { return await db.query(sql); }
  finally { await db.exec('RESET ROLE'); }
};
const insert = (id: string, kind = 'payable', credit = '150') => `INSERT INTO public."InventoryDebtItems"
  ("Id","Kind","CategoryName","Code","Name","BeginningCredit") VALUES ('${id}','${kind}','HTK Lúa Gạo','NCC01','Xi măng',${credit})`;

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE FUNCTION public.has_module(text) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT coalesce(current_setting('test.module',true),'yes')<>'no' $$;
  `);
  const sql = readFileSync('supabase/migrations/80_inventory_debt_items.sql', 'utf8');
  await db.exec(sql);
  await db.exec(sql);
}, 30000);
afterAll(async () => { await db.close(); });

describe.sequential('migration 80: InventoryDebtItems', () => {
  it('chạy lại lần hai không lỗi, có RLS và chỉ mục theo ngành hàng', async () => {
    const rls = await db.query<{ relrowsecurity: boolean }>(`SELECT relrowsecurity FROM pg_class WHERE relname='InventoryDebtItems'`);
    expect(rls.rows[0].relrowsecurity).toBe(true);
    const idx = await db.query(`SELECT 1 FROM pg_indexes WHERE indexname='idx_inventory_debt_items_category_kind'`);
    expect(idx.rows).toHaveLength(1);
  });

  it('người dùng có module đọc, thêm, sửa, xóa được', async () => {
    await as('authenticated', insert('d1'));
    expect((await as('authenticated', 'SELECT * FROM public."InventoryDebtItems"')).rows).toHaveLength(1);
    const updated = await as('authenticated', `UPDATE public."InventoryDebtItems" SET "OccurredDebit"=50 WHERE "Id"='d1' RETURNING "OccurredDebit"`);
    expect(updated.rows).toEqual([{ OccurredDebit: '50' }]);
    await as('authenticated', insert('d2', 'receivable'));
    await as('authenticated', `DELETE FROM public."InventoryDebtItems" WHERE "Id"='d2'`);
    expect((await as('authenticated', 'SELECT "Id" FROM public."InventoryDebtItems"')).rows).toEqual([{ Id: 'd1' }]);
  });

  it('không có module inventory thì không đọc, không ghi được', async () => {
    await db.exec(`SELECT set_config('test.module','no',false)`);
    expect((await as('authenticated', 'SELECT * FROM public."InventoryDebtItems"')).rows).toHaveLength(0);
    await expect(as('authenticated', insert('d3'))).rejects.toThrow(/row-level security/);
    await db.exec(`SELECT set_config('test.module','yes',false)`);
  });

  it('anon không có quyền trên bảng', async () => {
    await expect(as('anon', 'SELECT * FROM public."InventoryDebtItems"')).rejects.toThrow(/permission denied/);
  });

  it('chặn loại công nợ lạ và số tiền âm', async () => {
    await expect(as('authenticated', insert('d4', 'other'))).rejects.toThrow(/check constraint/);
    await expect(as('authenticated', insert('d5', 'payable', '-1'))).rejects.toThrow(/check constraint/);
  });
});
