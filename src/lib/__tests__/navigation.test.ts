import { describe, it, expect } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS } from '../navigation';
import { ROUTE_OF } from '../routes';

describe('navigation', () => {
  it('có đúng 21 màn', () => {
    expect(NAV_ITEMS).toHaveLength(21);
  });

  it('không id nào trùng', () => {
    const ids = NAV_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('NAV_ITEMS là bản trải phẳng của NAV_GROUPS, đúng thứ tự', () => {
    const phang = NAV_GROUPS.flatMap(g => g.items);
    expect(phang.map(i => i.id)).toEqual(NAV_ITEMS.map(i => i.id));
  });

  it('mọi mục đều có nhãn, nhóm và biểu tượng', () => {
    for (const item of NAV_ITEMS) {
      expect(item.labelKey, `${item.id} thiếu labelKey`).toBeTruthy();
      expect(item.groupKey, `${item.id} thiếu groupKey`).toBeTruthy();
      expect(item.icon, `${item.id} thiếu icon`).toBeTruthy();
    }
  });

  it('groupKey của mỗi mục khớp nhóm chứa nó', () => {
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        expect(item.groupKey).toBe(g.groupKey);
      }
    }
  });

  it('mọi mục đều có từ khoá tìm kiếm không dấu', () => {
    for (const item of NAV_ITEMS) {
      expect(item.keywords.length, `${item.id} không có từ khoá`).toBeGreaterThan(0);
      for (const kw of item.keywords) {
        expect(kw, `${item.id}: từ khoá "${kw}" phải viết thường không dấu`).toMatch(/^[a-z0-9 ]+$/);
      }
    }
  });

  it('giữ đúng bộ id mà App.tsx đang xử lý', () => {
    expect(NAV_ITEMS.map(i => i.id).sort()).toEqual([
      'business-plan', 'calculators', 'card-policies', 'cof', 'collaterals',
      'corporate-financial', 'credit-cards', 'credit-contracts', 'customers', 'dashboard', 'disbursement', 'inventory',
      'loans', 'mdsdv', 'post-loan', 'quiz-bank',
      'rate-quote', 'retail-invoice', 'settings', 'shopping-checklist', 'templates',
    ]);
  });
});

describe('navigation — đường dẫn', () => {
  it('mọi mục đều có đường dẫn khớp bảng đường dẫn', () => {
    for (const item of NAV_ITEMS) {
      expect(item.path, `${item.id} thiếu path`).toBeTruthy();
      expect(item.path).toBe(ROUTE_OF[item.id]);
    }
  });

  it('không hai mục nào chung một đường dẫn', () => {
    const paths = NAV_ITEMS.map(i => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
