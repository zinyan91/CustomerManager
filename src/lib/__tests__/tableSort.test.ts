import { describe, it, expect } from 'vitest';
import { nextSortState, sortRows } from '../tableSort';
import { INVENTORY_SORT_ACCESSORS, DEBT_SORT_ACCESSORS } from '../inventoryLedgerSort';
import { toTemplateItems, type InventoryItem } from '../inventory';
import type { ReceivableItem } from '../debt';

const item = (id: string, code: string, name: string, unitPrice: number, beginningQty: number, exportQty = 0): InventoryItem =>
  ({ id, code, name, unit: 'Kg', unitPrice, beginningQty, importQty: 0, exportQty });

const items = [
  item('a', 'SP10', 'Đường', 10_000, 5),
  item('b', 'SP2', 'Bột mì', 20_000, 1),
  item('c', 'SP1', 'Ăn liền', 5_000, 100, 90),
];

describe('sắp xếp theo cột', () => {
  it('bấm cùng cột lần lượt: tăng → giảm → bỏ sắp xếp; cột khác bắt đầu lại từ tăng', () => {
    const asc = nextSortState(null, 'name');
    expect(asc).toEqual({ key: 'name', direction: 'asc' });
    const desc = nextSortState(asc, 'name');
    expect(desc).toEqual({ key: 'name', direction: 'desc' });
    expect(nextSortState(desc, 'name')).toBeNull();
    expect(nextSortState(desc, 'code')).toEqual({ key: 'code', direction: 'asc' });
  });

  it('chữ theo thứ tự tiếng Việt, mã có số theo giá trị số', () => {
    expect(sortRows(items, { key: 'name', direction: 'asc' }, INVENTORY_SORT_ACCESSORS).map(r => r.id)).toEqual(['c', 'b', 'a']);
    expect(sortRows(items, { key: 'code', direction: 'asc' }, INVENTORY_SORT_ACCESSORS).map(r => r.code)).toEqual(['SP1', 'SP2', 'SP10']);
  });

  it('sắp được theo cột tự tính (thành tiền cuối kỳ), giảm dần', () => {
    expect(sortRows(items, { key: 'endingValue', direction: 'desc' }, INVENTORY_SORT_ACCESSORS).map(r => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('không sắp xếp thì giữ nguyên thứ tự và không đổi mảng gốc', () => {
    const copy = sortRows(items, null, INVENTORY_SORT_ACCESSORS);
    expect(copy).toEqual(items);
    expect(copy).not.toBe(items);
    sortRows(items, { key: 'name', direction: 'asc' }, INVENTORY_SORT_ACCESSORS);
    expect(items.map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('giá trị bằng nhau giữ thứ tự ban đầu', () => {
    const tied = [item('x', 'A', 'X', 1, 1), item('y', 'B', 'Y', 1, 1), item('z', 'C', 'Z', 1, 1)];
    expect(sortRows(tied, { key: 'unitPrice', direction: 'desc' }, INVENTORY_SORT_ACCESSORS).map(r => r.id)).toEqual(['x', 'y', 'z']);
  });

  it('công nợ sắp theo số dư cuối kỳ Có', () => {
    const debts: ReceivableItem[] = [
      { id: '1', code: 'N1', name: 'A', beginningDebit: 0, beginningCredit: 10, occurredDebit: 0, occurredCredit: 0 },
      { id: '2', code: 'N2', name: 'B', beginningDebit: 0, beginningCredit: 50, occurredDebit: 0, occurredCredit: 0 },
    ];
    expect(sortRows(debts, { key: 'endingCredit', direction: 'desc' }, DEBT_SORT_ACCESSORS).map(r => r.id)).toEqual(['2', '1']);
  });
});

describe('toTemplateItems', () => {
  it('bỏ id, giữ đủ các trường của mẫu theo đúng thứ tự', () => {
    expect(toTemplateItems(items.slice(0, 1))).toEqual([
      { code: 'SP10', name: 'Đường', unit: 'Kg', unitPrice: 10_000, beginningQty: 5, importQty: 0, exportQty: 0 },
    ]);
  });
});
