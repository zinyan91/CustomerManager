// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { CollateralView } from '../views/CollateralView';

vi.mock('../../lib/api', () => ({
  fetchCollateralsAPI: async () => ([
    {
      Id: 1, CustomerId: 55, AssetCode: 'TS-55', AssetType: 'BĐS - Loại 1',
      AppraisedValue: 1_000_000_000, LtvPercent: 80, AppraisalDate: '2026-01-01', AppraisalTenorMonths: 120,
    },
    {
      Id: 2, CustomerId: 77, AssetCode: 'TS-77', AssetType: 'BĐS - Loại 2',
      AppraisedValue: 2_000_000_000, LtvPercent: 70, AppraisalDate: '2026-01-01', AppraisalTenorMonths: 120,
    },
  ]),
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  saveCollateralAPI: async () => ({}),
  deleteCollateralAPI: async () => {},
}));

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/collaterals" element={<CollateralView />} />
        <Route path="/customers/:customerId/collaterals" element={<CollateralView />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

function coDong(text: string): boolean {
  return screen.queryAllByText((_content, node) =>
    node !== null && node.children.length === 0 && node.textContent === text
  ).length > 0;
}

describe('CollateralView tổng hợp theo khách', () => {
  it('đường phẳng: tổng hợp là của toàn bộ danh mục', async () => {
    dungLenO('/collaterals');
    await waitFor(() => expect(coDong('2 tài sản')).toBe(true));
    expect(coDong('3.000.000.000 VNĐ')).toBe(true);
    expect(coDong('2.200.000.000 VNĐ')).toBe(true);
  });

  it('đường lồng: tổng hợp chỉ là của khách đang chọn', async () => {
    dungLenO('/customers/55/collaterals');
    await waitFor(() => expect(coDong('1 tài sản')).toBe(true));
    expect(coDong('1.000.000.000 VNĐ')).toBe(true);
    expect(coDong('800.000.000 VNĐ')).toBe(true);
    expect(coDong('3.000.000.000 VNĐ')).toBe(false);
  });

  it('đường lồng: gõ tìm kiếm không thu hẹp tổng hợp', async () => {
    dungLenO('/customers/55/collaterals');
    await waitFor(() => expect(coDong('1 tài sản')).toBe(true));

    const oTimMaTS = screen.getByPlaceholderText(/mã tsbđ/i);
    fireEvent.change(oTimMaTS, { target: { value: 'khong-ton-tai' } });

    await waitFor(() => expect(screen.queryByText('TS-55')).toBeNull());
    expect(coDong('1 tài sản')).toBe(true);
    expect(coDong('1.000.000.000 VNĐ')).toBe(true);
  });
});
