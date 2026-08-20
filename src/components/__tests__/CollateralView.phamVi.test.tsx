// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCollateralsAPI: async () => ([
    { Id: 1, CustomerId: 55, AssetCode: 'TS-55', AssetType: 'BĐS - Loại 1', AppraisedValue: 1_000_000_000, LtvPercent: 80 },
    { Id: 2, CustomerId: 77, AssetCode: 'TS-77', AssetType: 'BĐS - Loại 1', AppraisedValue: 2_000_000_000, LtvPercent: 80 },
  ]),
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  saveCollateralAPI: async () => ({}),
  deleteCollateralAPI: async () => {},
}));

import { useCollateralController } from '../../hooks/useCollateralController';

function Probe() {
  const { filteredCollaterals } = useCollateralController();
  return <span data-testid="ma">{filteredCollaterals.map(c => c.AssetCode).join(',')}</span>;
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/collaterals" element={<Probe />} />
        <Route path="/customers/:customerId/collaterals" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('CollateralView theo phạm vi khách', () => {
  it('đường phẳng hiện tài sản của mọi khách', async () => {
    dungLenO('/collaterals');
    await waitFor(() => expect(screen.getByTestId('ma').textContent).toContain('TS-55'));
    expect(screen.getByTestId('ma').textContent).toContain('TS-77');
  });

  it('đường lồng chỉ hiện tài sản của khách đó', async () => {
    dungLenO('/customers/55/collaterals');
    await waitFor(() => expect(screen.getByTestId('ma').textContent).toBe('TS-55'));
  });
});
