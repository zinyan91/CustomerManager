// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InventoryItemsTable } from '../InventoryItemsTable';
import { DebtLedgerTable } from '../DebtLedgerTable';
import { computeInventorySummary, type InventoryItem } from '../../../lib/inventory';
import { computeReceivableSummary, type ReceivableItem } from '../../../lib/debt';

afterEach(cleanup);

const items: InventoryItem[] = [
  { id: 'a', code: 'SP01', name: 'Gạo ST25', unit: 'Kg', unitPrice: 32_000, beginningQty: 100, importQty: 20, exportQty: 10 },
];

function renderInventory(overrides: Partial<Parameters<typeof InventoryItemsTable>[0]> = {}) {
  const props = {
    items, summary: computeInventorySummary(items), sort: null,
    onSort: vi.fn(), onUpdate: vi.fn(), onRemove: vi.fn(), ...overrides,
  };
  render(<InventoryItemsTable {...props} />);
  return props;
}

describe('bảng tồn kho sửa trực tiếp', () => {
  it('sửa số lượng ngay trong ô, lưu khi rời ô', () => {
    const props = renderInventory();
    const cell = screen.getByLabelText('Nhập trong kỳ dòng 1');
    fireEvent.change(cell, { target: { value: '35' } });
    fireEvent.blur(cell);
    expect(props.onUpdate).toHaveBeenCalledWith('a', { importQty: 35 });
  });

  it('Esc hủy thay đổi, không lưu', () => {
    const props = renderInventory();
    const cell = screen.getByLabelText('Tên mặt hàng dòng 1') as HTMLInputElement;
    fireEvent.change(cell, { target: { value: 'Tên mới' } });
    fireEvent.keyDown(cell, { key: 'Escape' });
    fireEvent.blur(cell);
    expect(props.onUpdate).not.toHaveBeenCalled();
    expect(cell.value).toBe('Gạo ST25');
  });

  it('không cho để trống tên, không lưu khi giá trị không đổi', () => {
    const props = renderInventory();
    const name = screen.getByLabelText('Tên mặt hàng dòng 1');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.blur(name);
    const qty = screen.getByLabelText('Tồn đầu kỳ dòng 1');
    fireEvent.blur(qty);
    expect(props.onUpdate).not.toHaveBeenCalled();
  });

  it('cột tự tính chỉ hiển thị, không có ô nhập; không còn nút sửa', () => {
    renderInventory();
    expect(screen.getAllByRole('textbox')).toHaveLength(7);
    expect(screen.queryByLabelText(/Tồn cuối kỳ dòng/)).toBeNull();
    expect(screen.queryByLabelText(/Thành tiền dòng/)).toBeNull();
    expect(screen.queryByTitle('Sửa sản phẩm')).toBeNull();
  });

  it('bấm tiêu đề cột để sắp xếp, hiện chiều đang sắp', () => {
    const props = renderInventory({ sort: { key: 'endingValue', direction: 'desc' } });
    fireEvent.click(screen.getByRole('button', { name: /TÊN MẶT HÀNG/ }));
    expect(props.onSort).toHaveBeenCalledWith('name');
    expect(screen.getByRole('columnheader', { name: /THÀNH TIỀN/ }).getAttribute('aria-sort')).toBe('descending');
  });
});

describe('bảng công nợ sửa trực tiếp', () => {
  const debts: ReceivableItem[] = [
    { id: 'p1', code: 'NCC01', name: 'Xi măng', beginningDebit: 0, beginningCredit: 150, occurredDebit: 50, occurredCredit: 80 },
  ];

  it('sửa số dư đầu kỳ trong ô; số dư cuối kỳ không sửa được', () => {
    const onUpdate = vi.fn();
    render(<DebtLedgerTable kind="payable" items={debts} allItemsCount={1} summary={computeReceivableSummary(debts)}
      searchTerm="" onSearchChange={vi.fn()} sort={null} onSort={vi.fn()} onUpdate={onUpdate} onDelete={vi.fn()} />);
    const cell = screen.getByLabelText('Có đầu kỳ dòng 1');
    fireEvent.change(cell, { target: { value: '200' } });
    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.blur(cell);
    expect(onUpdate).toHaveBeenCalledWith('p1', { beginningCredit: 200 });
    expect(screen.getAllByRole('textbox').filter(el => el.getAttribute('aria-label')?.includes('dòng 1'))).toHaveLength(6);
  });
});
