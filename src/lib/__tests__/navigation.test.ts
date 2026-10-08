import { describe, it, expect } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS, visibleNavGroups, visibleNavItems } from '../navigation';
import { ROUTE_OF } from '../routes';

describe('navigation', () => {
  it('có đúng 18 màn', () => {
    expect(NAV_ITEMS).toHaveLength(18);
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
      'admin', 'business-plan', 'calculators', 'collaterals',
      'credit-cards', 'credit-contracts', 'customers', 'dashboard', 'dispatches', 'hub', 'inventory',
      'loans', 'mortgage-contracts', 'office', 'post-loan',
      'rate-quote', 'settings', 'storage',
    ]);
  });
});

describe('navigation — mục mở ở tab mới', () => {
  it('chỉ mục Quản trị mở ở tab mới', () => {
    expect(NAV_ITEMS.filter(i => i.newTab).map(i => i.id)).toEqual(['admin']);
  });
});

describe('navigation — mục chỉ dành cho quản trị', () => {
  it('chỉ mục Quản trị đánh dấu adminOnly', () => {
    expect(NAV_ITEMS.filter(i => i.adminOnly).map(i => i.id)).toEqual(['admin']);
  });

  it('không có quyền quản lý người dùng thì ẩn mục Người dùng', () => {
    expect(visibleNavItems(false)).toHaveLength(17);
    expect(visibleNavItems(false).some(i => i.id === 'admin')).toBe(false);
    expect(visibleNavGroups(false).flatMap(g => g.items).some(i => i.id === 'admin')).toBe(false);
  });

  it('có quyền thì hiện đủ 18 mục', () => {
    expect(visibleNavItems(true)).toHaveLength(18);
    expect(visibleNavGroups(true).flatMap(g => g.items).some(i => i.id === 'admin')).toBe(true);
  });

  it('không để lại nhóm rỗng', () => {
    for (const g of visibleNavGroups(false)) expect(g.items.length).toBeGreaterThan(0);
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
