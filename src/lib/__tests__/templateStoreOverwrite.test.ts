import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InventoryCategoryTemplate } from '../../data/inventoryTemplates';

const h = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { from: () => ({ upsert: h.upsert }) } }));

import { overwriteInventoryTemplateItems } from '../templateStore';

const store: Record<string, string> = {};
const templates: InventoryCategoryTemplate[] = [
  { id: 'gao', name: 'HTK Lúa Gạo', items: [{ code: 'C1', name: 'Cũ', unit: 'Kg', unitPrice: 1, beginningQty: 1, importQty: 0, exportQty: 0 }] },
  { id: 'xm', name: 'HTK Xi măng', items: [] },
];
const newItems = [
  { code: 'M2', name: 'Mới 2', unit: 'Bao', unitPrice: 2, beginningQty: 3, importQty: 0, exportQty: 0 },
  { code: 'M1', name: 'Mới 1', unit: 'Bao', unitPrice: 5, beginningQty: 1, importQty: 0, exportQty: 0 },
];

beforeEach(() => {
  for (const k in store) delete store[k];
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
    length: 0,
    key: () => null,
  };
  h.upsert.mockReset();
});

describe('lưu đè mẫu ngành hàng', () => {
  it('thay toàn bộ mặt hàng của đúng mẫu, giữ thứ tự, không đụng mẫu khác', async () => {
    h.upsert.mockResolvedValue({ error: null });
    const updated = await overwriteInventoryTemplateItems(templates, 'gao', newItems);
    expect(updated.find(t => t.id === 'gao')).toEqual({ id: 'gao', name: 'HTK Lúa Gạo', items: newItems });
    expect(updated.find(t => t.id === 'xm')).toBe(templates[1]);
    expect(h.upsert).toHaveBeenCalledWith([expect.objectContaining({ Id: 'gao', Items: newItems })]);
    expect(JSON.parse(Object.values(store)[0]).find((t: InventoryCategoryTemplate) => t.id === 'gao').items).toEqual(newItems);
  });

  it('báo nguyên lỗi của CSDL thay vì im lặng', async () => {
    h.upsert.mockResolvedValue({ error: { message: 'permission denied for table InventoryCategoryTemplates' } });
    await expect(overwriteInventoryTemplateItems(templates, 'gao', newItems))
      .rejects.toThrow('permission denied for table InventoryCategoryTemplates');
  });

  it('mẫu không còn tồn tại thì báo lỗi', async () => {
    await expect(overwriteInventoryTemplateItems(templates, 'khong-co', newItems)).rejects.toThrow('Không tìm thấy');
    expect(h.upsert).not.toHaveBeenCalled();
  });
});
