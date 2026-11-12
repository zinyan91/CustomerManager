// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

const base = { CustomerId: 55, LoanMethod: 'Hạn mức tín dụng', ContractAmount: 1_000_000_000, IsClosed: false };
vi.mock('../../lib/api', () => ({
  fetchMortgageContractsAPI: async () => [],
  fetchCustomersAPI: async () => [{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }],
  fetchCreditContractsByCustomerAPI: async () => [
    { ...base, Id: 1, HdtdNumber: 'HDTD-DA-TAT-TOAN', ContractStartDate: '2024-01-01', ContractEndDate: '2025-01-01', IsClosed: true },
    { ...base, Id: 2, HdtdNumber: 'HDTD-CU', ContractStartDate: '2025-07-08', ContractEndDate: '2026-07-08' },
    { ...base, Id: 3, HdtdNumber: 'HDTD-MOI', ContractStartDate: '2026-08-22', ContractEndDate: '2027-08-22', RenewsCreditContractId: 2 },
  ],
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { CreditContractView } from '../views/CreditContractView';

afterEach(cleanup);

const dungLen = () => render(
  <MemoryRouter initialEntries={['/customers/55/credit-contracts']}>
    <Routes>
      <Route path="/customers/:customerId/credit-contracts" element={<CreditContractView />} />
    </Routes>
  </MemoryRouter>,
);

describe('CreditContractView — HĐTD đã tái tục và đã tất toán ẩn riêng', () => {
  it('mặc định chỉ hiện HĐTD đang dùng; tick riêng từng nhóm để hiện lại, nhãn tách bạch', async () => {
    dungLen();
    await screen.findByText(/HDTD-MOI/);
    expect(screen.queryByText(/HDTD-CU/)).toBeNull();
    expect(screen.queryByText(/HDTD-DA-TAT-TOAN/)).toBeNull();

    fireEvent.click(screen.getByLabelText('Hiện 1 HĐTD đã tái tục'));
    expect(await screen.findByText(/HDTD-CU/)).toBeTruthy();
    expect(screen.getByText('ĐÃ TÁI TỤC')).toBeTruthy();
    expect(screen.queryByText(/HDTD-DA-TAT-TOAN/)).toBeNull();

    fireEvent.click(screen.getByLabelText('Hiện 1 HĐTD đã tất toán'));
    expect(await screen.findByText(/HDTD-DA-TAT-TOAN/)).toBeTruthy();
    expect(screen.getByText('ĐÃ TẤT TOÁN')).toBeTruthy();
  });
});
