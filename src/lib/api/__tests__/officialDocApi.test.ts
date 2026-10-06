import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OfficialDocFilter, OfficialDocInput } from '../../../types/officialDoc';

const h = vi.hoisted(() => ({
  calls: [] as Array<[string, ...unknown[]]>,
  result: { data: null as unknown, count: null as number | null, error: null as null | { message: string; code?: string } },
  results: [] as Array<{ data: unknown; count: number | null; error: null | { message: string; code?: string } }>,
}));

vi.mock('../../supabase', () => {
  const makeBuilder = () => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'or', 'order', 'range', 'limit', 'insert', 'update', 'delete', 'single']) {
      b[m] = (...args: unknown[]) => {
        h.calls.push([m, ...args]);
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown) => resolve(h.results.length ? h.results.shift() : h.result);
    return b;
  };
  return { supabase: { from: (t: string) => (h.calls.push(['from', t]), makeBuilder()) } };
});

import { countByCategory, deleteOfficialDoc, listDocIndex, saveOfficialDoc, searchOfficialDocs } from '../officialDocApi';

const EMPTY: OfficialDocFilter = { search: '', category: 'all', status: 'all', issuedFrom: '', issuedTo: '' };
const ROW = {
  Id: 1, Category: 'van-ban', DocNumber: 'S1', Title: 'T',
  IssuedDate: '2026-01-01', EffectiveFrom: '2026-01-01', EffectiveTo: null, Files: [], CreatedAt: 'c', UpdatedAt: 'u',
};
const INPUT: OfficialDocInput = {
  category: 'van-ban', docNumber: 'S1', title: 'T',
  issuedDate: '2026-01-01', effectiveFrom: '2026-01-01', effectiveTo: null, files: [],
};

beforeEach(() => {
  h.calls.length = 0;
  h.results.length = 0;
  h.result = { data: null, count: null, error: null };
});

describe('searchOfficialDocs', () => {
  it('truy vấn đúng bảng, sắp xếp ngày ban hành giảm dần và phân trang', async () => {
    h.result = { data: [ROW], count: 31, error: null };
    const out = await searchOfficialDocs({ ...EMPTY, search: 'lai suat', category: 'hop-dong' }, 2);

    expect(out.total).toBe(31);
    expect(out.outOfRange).toBe(false);
    expect(out.docs.map((d) => d.id)).toEqual(['1']);
    expect(h.calls).toContainEqual(['from', 'OfficialDocuments']);
    expect(h.calls).toContainEqual(['select', '*', { count: 'exact' }]);
    expect(h.calls).toContainEqual(['ilike', 'SearchText', '%lai%']);
    expect(h.calls).toContainEqual(['eq', 'Category', 'hop-dong']);
    expect(h.calls).toContainEqual(['order', 'IssuedDate', { ascending: false }]);
    expect(h.calls).toContainEqual(['range', 15, 29]);
  });

  it('DB báo lỗi thì ném lỗi tiếng Việt, không trả danh sách rỗng im lặng', async () => {
    h.result = { data: null, count: null, error: { message: 'boom' } };
    await expect(searchOfficialDocs(EMPTY, 1)).rejects.toThrow(/Không tìm được văn bản: boom/);
  });

  it('trang vượt quá số dòng (PGRST103) được báo outOfRange', async () => {
    h.result = { data: null, count: null, error: { message: 'range', code: 'PGRST103' } };
    expect(await searchOfficialDocs(EMPTY, 9)).toEqual({ docs: [], total: 0, outOfRange: true });
  });
});

describe('countByCategory', () => {
  it('đếm từng mục theo cùng bộ lọc và cộng thành Tất cả', async () => {
    h.results.push(
      { data: null, count: 5, error: null },
      { data: null, count: 3, error: null },
      { data: null, count: 0, error: null },
      { data: null, count: 2, error: null }
    );
    const counts = await countByCategory({ ...EMPTY });

    expect(counts).toEqual({ all: 10, 'van-ban': 5, 'hop-dong': 3, 'cong-van': 0, khac: 2 });
    expect(h.calls.filter((c) => c[0] === 'select').every((c) => (c[2] as { head: boolean }).head === true)).toBe(true);
    expect(h.calls.filter((c) => c[0] === 'eq' && c[1] === 'Category').map((c) => c[2])).toEqual([
      'van-ban', 'hop-dong', 'cong-van', 'khac',
    ]);
  });

  it('một truy vấn lỗi thì ném lỗi', async () => {
    h.results.push({ data: null, count: null, error: { message: 'x' } });
    await expect(countByCategory(EMPTY)).rejects.toThrow(/Không đếm được văn bản/);
  });
});

describe('saveOfficialDoc', () => {
  it('thêm mới khi chưa có id, trả về văn bản đã lưu', async () => {
    h.result = { data: ROW, count: null, error: null };
    const saved = await saveOfficialDoc(null, INPUT);
    expect(saved.id).toBe('1');
    expect(h.calls.some((c) => c[0] === 'insert')).toBe(true);
    expect(h.calls.some((c) => c[0] === 'update')).toBe(false);
  });

  it('sửa theo Id khi đã có', async () => {
    h.result = { data: ROW, count: null, error: null };
    await saveOfficialDoc('1', INPUT);
    expect(h.calls).toContainEqual(['eq', 'Id', 1]);
    expect(h.calls.some((c) => c[0] === 'update')).toBe(true);
  });

  it('dữ liệu sai thì không gọi DB', async () => {
    await expect(saveOfficialDoc(null, { ...INPUT, title: '' })).rejects.toThrow(/tiêu đề/i);
    expect(h.calls).toEqual([]);
  });

  it('DB từ chối (RLS) thì ném lỗi rõ ràng', async () => {
    h.result = { data: null, count: null, error: { message: 'new row violates row-level security policy' } };
    await expect(saveOfficialDoc(null, INPUT)).rejects.toThrow(/Không lưu được văn bản: new row violates/);
  });
});

describe('deleteOfficialDoc', () => {
  it('xóa thành công khi có dòng bị xóa', async () => {
    h.result = { data: [{ Id: 1 }], count: null, error: null };
    await expect(deleteOfficialDoc('1')).resolves.toBeUndefined();
    expect(h.calls).toContainEqual(['eq', 'Id', 1]);
  });

  it('không có dòng nào bị xóa (không đủ quyền) thì ném lỗi', async () => {
    h.result = { data: [], count: null, error: null };
    await expect(deleteOfficialDoc('1')).rejects.toThrow(/không đủ quyền/);
  });

  it('DB báo lỗi thì ném lỗi', async () => {
    h.result = { data: null, count: null, error: { message: 'x' } };
    await expect(deleteOfficialDoc('1')).rejects.toThrow(/Không xóa được văn bản: x/);
  });
});

describe('listDocIndex', () => {
  it('chỉ chọn các cột gọn, mới nhất trước, có giới hạn', async () => {
    h.result = { data: [ROW], count: null, error: null };
    const docs = await listDocIndex();
    expect(docs.map((d) => d.id)).toEqual(['1']);
    expect(h.calls).toContainEqual(['select', 'Id,Category,DocNumber,Title,IssuedDate,EffectiveFrom,EffectiveTo,Files,UpdatedAt']);
    expect(h.calls).toContainEqual(['order', 'IssuedDate', { ascending: false }]);
    expect(h.calls).toContainEqual(['limit', 500]);
  });

  it('DB báo lỗi thì ném lỗi', async () => {
    h.result = { data: null, count: null, error: { message: 'boom' } };
    await expect(listDocIndex()).rejects.toThrow(/Không đọc được danh mục văn bản: boom/);
  });
});
