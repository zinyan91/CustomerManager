// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dungHook = vi.fn();
vi.mock('../../hooks/useCustomerContext', () => ({
  useCustomerContext: (...a: unknown[]) => dungHook(...a),
}));

import { CustomerContextBar } from '../CustomerContextBar';

const nguonComponent = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../CustomerContextBar.tsx'),
  'utf8'
);

const DAY_DU = {
  customer: { Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' },
  summary: {
    granted: 1_000_000_000, outstanding: 250_000_000, available: 750_000_000,
    debtGroup: 1, maxOverdueDays: 0, activeKunnCount: 1,
  },
  loading: false, error: null, reload: () => {},
};

function ViTri() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/loans" element={<><CustomerContextBar /><ViTri /></>} />
        <Route path="/customers" element={<><CustomerContextBar /><ViTri /></>} />
        <Route path="/customers/:customerId/loans" element={<><CustomerContextBar /><ViTri /></>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dungHook.mockReturnValue(DAY_DU);
});
afterEach(cleanup);

describe('CustomerContextBar', () => {
  it('không có :customerId thì không render gì', () => {
    const { container } = dungLenO('/loans');
    expect(container.querySelector('[data-testid="thanh-ngu-canh"]')).toBeNull();
    expect(dungHook).toHaveBeenCalledWith(null);
  });

  it('có :customerId thì hiện đủ sáu thông tin của spec', () => {
    dungLenO('/customers/55/loans');
    expect(screen.getByText('Trần Thị B')).toBeTruthy();
    expect(screen.getByText(/900055/)).toBeTruthy();
    expect(screen.getByText(/0900000055/)).toBeTruthy();
    expect(screen.getByText(/250\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/750\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/Nhóm 1/)).toBeTruthy();
  });

  it('nút đổi khách dẫn về danh sách khách hàng', () => {
    dungLenO('/customers/55/loans');
    fireEvent.click(screen.getByRole('button', { name: /đổi khách/i }));
    expect(screen.getByTestId('path').textContent).toBe('/customers');
  });

  it('đang chuyển sang khách khác thì không hiện tên/số của khách cũ còn sót trong state', () => {
    dungHook.mockReturnValue({ ...DAY_DU, loading: true });
    dungLenO('/customers/60/loans');
    expect(screen.queryByText('Trần Thị B')).toBeNull();
    expect(screen.queryByText(/900055/)).toBeNull();
    expect(screen.queryByText(/0900000055/)).toBeNull();
    expect(screen.queryByText(/250\.000\.000/)).toBeNull();
    expect(screen.queryByText(/750\.000\.000/)).toBeNull();
    expect(screen.queryByText(/Nhóm 1/)).toBeNull();
    expect(screen.getByTestId('thanh-ngu-canh')).toBeTruthy();
  });

  it('lỗi nạp thì nói thẳng ngay trên thanh', () => {
    dungHook.mockReturnValue({ ...DAY_DU, error: 'RLS chan', summary: null, customer: null });
    dungLenO('/customers/55/loans');
    expect(screen.getByText(/RLS chan/)).toBeTruthy();
  });

  it('nhóm nợ khác 1 thì dùng bảng tra màu, không dựng tên lớp động', () => {
    dungHook.mockReturnValue({ ...DAY_DU, summary: { ...DAY_DU.summary, debtGroup: 3, maxOverdueDays: 95 } });
    const { container } = dungLenO('/customers/55/loans');
    expect(container.querySelector('.bg-g3')).toBeTruthy();
    expect(screen.getByText(/Nhóm 3/)).toBeTruthy();
  });

  it('mã nguồn không dựng tên lớp Tailwind động cho nhóm nợ (bg-g${...})', () => {
    expect(nguonComponent).not.toMatch(/bg-g\$\{/);
    expect(nguonComponent).toMatch(/DEBT_GROUP_COLOR\[/);
  });
});
