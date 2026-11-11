// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LoanPortfolioTable } from '../LoanPortfolioTable';
import type { PortfolioTable } from '../../../lib/reports/loanPortfolioTables';

afterEach(cleanup);

const table: PortfolioTable = {
  id: 'secured', title: 'Vay có TSBĐ', sheetName: 'Vay_Co_TSBD',
  columns: [
    { header: 'STT', width: 6, kind: 'center', sum: false },
    { header: 'Mã CIF KH', width: 14, kind: 'center', sum: false },
    { header: 'Họ tên KH', width: 28, kind: 'text', sum: false },
    { header: 'Ngày kết thúc GNN', width: 16, kind: 'center', sum: false },
    { header: 'Dư nợ hiện hữu (VNĐ)', width: 20, kind: 'money', sum: true },
  ],
  rows: [[
    { value: 1, tone: null }, { value: 'CIF001', tone: null }, { value: 'Nguyễn Văn A', tone: null },
    { value: '01/08/2026', tone: 'warn' }, { value: 150_000_000, tone: null },
  ]],
  totals: [null, null, null, null, 150_000_000],
};

describe('LoanPortfolioTable — rê chuột vào dòng', () => {
  it('cả dòng đổi nền đậm và có viền nhấn, kể cả ba cột cố định; ô tô màu giữ màu và vẫn có viền', () => {
    render(<LoanPortfolioTable table={table} />);
    const name = screen.getByText('Nguyễn Văn A');
    const row = name.closest('tr')!;
    expect(row.className).toContain('group');
    for (const cell of Array.from(row.querySelectorAll('td'))) {
      expect(cell.className).toContain('group-hover:shadow-');
    }
    expect(name.className).toContain('group-hover:bg-accent-soft');
    const toned = screen.getByText('01/08/2026');
    expect(toned.className).toContain('bg-warn-soft');
    expect(toned.className).not.toContain('group-hover:bg-accent-soft');
  });

  it('dòng TỔNG CỘNG không đổi khi rê chuột', () => {
    render(<LoanPortfolioTable table={table} />);
    expect(screen.getByText('TỔNG CỘNG').closest('tr')!.className).not.toContain('group');
  });
});
