// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchContractsAPI: async () => ([
    { Id: 100, CustomerId: 55, ContractNumber: 'KUNN-55', IsSettled: false, DisbursementDate: '2026-01-05', KunnTenor: '12 tháng' },
    { Id: 200, CustomerId: 77, ContractNumber: 'KUNN-77', IsSettled: false, DisbursementDate: '2026-01-05', KunnTenor: '12 tháng' },
  ]),
  fetchCollateralsAPI: async () => [],
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  fetchPostLoanControlRecordsAPI: async () => [],
  savePostLoanControlRecordAPI: async () => ({}),
  saveCollateralAppraisalAPI: async () => ({ Id: 1 }),
}));

import { usePostLoanControlController } from '../../hooks/usePostLoanControlController';

function Probe() {
  const { scopedItems, items, selectedCustomerId } = usePostLoanControlController();
  return (
    <div>
      <span data-testid="id">{selectedCustomerId === null ? 'null' : String(selectedCustomerId)}</span>
      <span data-testid="tat-ca">{items.length}</span>
      <span data-testid="trong-pham-vi">{scopedItems.length}</span>
    </div>
  );
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/post-loan-control" element={<Probe />} />
        <Route path="/customers/:customerId/post-loan-control" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('Kiểm soát sau vay theo URL', () => {
  it('đường phẳng vẫn hiện toàn danh mục', async () => {
    dungLenO('/post-loan-control');
    await waitFor(() => expect(Number(screen.getByTestId('tat-ca').textContent)).toBeGreaterThan(0));
    expect(screen.getByTestId('id').textContent).toBe('null');
    expect(screen.getByTestId('trong-pham-vi').textContent)
      .toBe(screen.getByTestId('tat-ca').textContent);
  });

  it('đường lồng thì thu hẹp về một khách', async () => {
    dungLenO('/customers/55/post-loan-control');
    await waitFor(() => expect(Number(screen.getByTestId('tat-ca').textContent)).toBeGreaterThan(0));
    expect(screen.getByTestId('id').textContent).toBe('55');
    expect(Number(screen.getByTestId('trong-pham-vi').textContent))
      .toBeLessThan(Number(screen.getByTestId('tat-ca').textContent));
  });
});
