// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataTable, type ColumnDef } from '../DataTable';

afterEach(cleanup);

interface Item {
  id: number;
  name: string;
  code: string;
  amount: number;
}

const COLUMNS: ColumnDef<Item>[] = [
  { key: 'name', label: 'Tên Khách Hàng', render: (r) => r.name, priority: 1 },
  { key: 'code', label: 'Mã CIF', render: (r) => r.code, priority: 1 },
  { key: 'amount', label: 'Dư Nợ', render: (r) => `${r.amount} đ`, priority: 2, align: 'right' },
];

const ITEMS: Item[] = [
  { id: 1, name: 'Nguyễn Văn A', code: '001', amount: 500000000 },
  { id: 2, name: 'Trần Thị B', code: '002', amount: 200000000 },
];

describe('DataTable Component', () => {
  it('renders table headers and rows on desktop', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ITEMS}
        rowKey={(r) => r.id}
        cardTitle={(r) => r.name}
      />
    );

    expect(screen.getAllByText('Tên Khách Hàng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nguyễn Văn A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trần Thị B').length).toBeGreaterThan(0);
  });

  it('renders empty text when rows is empty', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowKey={(r) => r.id}
        emptyText="Không tìm thấy bản ghi nào"
      />
    );
    expect(screen.getByText('Không tìm thấy bản ghi nào')).toBeTruthy();
  });

  it('handles row click events', () => {
    const handleRowClick = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ITEMS}
        rowKey={(r) => r.id}
        onRowClick={handleRowClick}
      />
    );

    fireEvent.click(screen.getAllByText('Nguyễn Văn A')[0]);
    expect(handleRowClick).toHaveBeenCalledWith(ITEMS[0]);
  });
});
