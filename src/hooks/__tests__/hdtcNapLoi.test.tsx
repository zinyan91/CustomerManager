// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchMortgageContractsAPI: async () => { throw new Error('mất mạng'); },
  fetchCollateralsAPI: async () => ([{ Id: 1, CustomerId: 55, AssetCode: 'TS-55', AssetType: 'BĐS - Loại 1', AppraisedValue: 1_000_000_000 }]),
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => ([{ Id: 2, CustomerId: 55, HdtdNumber: 'HDTD-55', IsClosed: false }]),
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveCollateralAPI: async () => ({}),
  deleteCollateralAPI: async () => {},
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { useCollateralController } from '../useCollateralController';
import { useCreditContractController } from '../useCreditContractController';

afterEach(cleanup);

function dung(path: string, route: string, el: React.ReactElement) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={el} /></Routes>
    </MemoryRouter>
  );
}

describe('nạp danh sách HĐTC lỗi ở màn hiện ngược', () => {
  it('màn Tài sản bảo đảm vẫn hiện tài sản và báo cột HĐTC có thể thiếu', async () => {
    function Probe() {
      const { filteredCollaterals, notification } = useCollateralController();
      return (
        <div>
          <span data-testid="ma">{filteredCollaterals.map(c => c.AssetCode).join(',')}</span>
          <span data-testid="tb">{notification?.message ?? ''}</span>
        </div>
      );
    }
    dung('/collaterals', '/collaterals', <Probe />);
    await waitFor(() => expect(screen.getByTestId('ma').textContent).toBe('TS-55'));
    expect(screen.getByTestId('tb').textContent).toMatch(/Không nạp được danh sách HĐTC/);
  });

  it('màn Hợp đồng tín dụng vẫn hiện HĐTD và báo dòng HĐTC có thể thiếu', async () => {
    function Probe() {
      const { contracts, notify } = useCreditContractController();
      return (
        <div>
          <span data-testid="hdtd">{contracts[0]?.HdtdNumber ?? '—'}</span>
          <span data-testid="tb">{notify?.message ?? ''}</span>
        </div>
      );
    }
    dung('/customers/55/credit-contracts', '/customers/:customerId/credit-contracts', <Probe />);
    await waitFor(() => expect(screen.getByTestId('hdtd').textContent).toBe('HDTD-55'));
    expect(screen.getByTestId('tb').textContent).toMatch(/Không nạp được danh sách HĐTC/);
  });
});
