// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { CreditContract, LoanContract } from '../../types';

const api = vi.hoisted(() => ({
  fetchCustomersAPI: vi.fn(),
  fetchCollateralsAPI: vi.fn(),
  fetchContractsAPI: vi.fn(),
  fetchCardContractsAPI: vi.fn(),
  fetchOutstandingSchedulesAPI: vi.fn(),
  fetchAllCreditContractsAPI: vi.fn(),
  fetchPaidPrincipalMapAPI: vi.fn(),
}));
vi.mock('../../lib/api', () => api);
vi.mock('../../context/ConfirmContext', () => ({ useConfirm: () => vi.fn() }));

import { DashboardView } from '../views/DashboardView';

afterEach(cleanup);

const OLD_HDTD: CreditContract = {
  Id: 1, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222', LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 4_000_000_000, ContractStartDate: '2024-01-10', ContractEndDate: '2025-01-10', IsClosed: false,
};
const NEW_HDTD: CreditContract = {
  Id: 2, CustomerId: 7, HdtdNumber: '2002/HDTD/9800001', LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 4_000_000_000, ContractStartDate: '2025-01-15', ContractEndDate: '2099-01-15', IsClosed: false,
};
const OLD_KUNN = {
  Id: 10, CustomerId: 7, CreditContractId: 1, ContractNumber: '2002/HDTD/9653222/GNN-03',
  LoanMethod: 'Hạn mức tín dụng', LoanAmount: 1_200_000_000, ContractAmount: 4_000_000_000,
  ContractStartDate: '2024-01-10', ContractEndDate: '2025-01-10',
  DisbursementDate: '2025-01-05', KunnDueDate: '2099-01-01', IsSettled: false, DebtGroup: 1,
} as LoanContract;

function setup(creditContracts: CreditContract[]) {
  api.fetchCustomersAPI.mockResolvedValue([{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT' }]);
  api.fetchCollateralsAPI.mockResolvedValue([]);
  api.fetchContractsAPI.mockResolvedValue([OLD_KUNN]);
  api.fetchCardContractsAPI.mockResolvedValue([]);
  api.fetchOutstandingSchedulesAPI.mockResolvedValue([]);
  api.fetchAllCreditContractsAPI.mockResolvedValue(creditContracts);
  api.fetchPaidPrincipalMapAPI.mockResolvedValue({});
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
}

async function hmtdTabCount() {
  const label = await screen.findByText('3. HMTD Hết Hạn');
  return label.parentElement!.querySelectorAll('span')[1].textContent;
}

describe('Dashboard: HĐTD cũ hết hạn khi KUNN còn trong hạn', () => {
  it('không tính vào "Quá hạn thu nợ" dù chưa tái cấp, nhưng vẫn nhắc ở tab HMTD', async () => {
    setup([OLD_HDTD]);
    expect(await screen.findByText('0 khoản nợ')).toBeTruthy();
    expect(await hmtdTabCount()).toBe('1');
  });

  it('đã có HĐTD mới còn hiệu lực thì HĐTD cũ không còn trong danh sách nhắc', async () => {
    setup([OLD_HDTD, NEW_HDTD]);
    expect(await screen.findByText('0 khoản nợ')).toBeTruthy();
    expect(await hmtdTabCount()).toBe('0');
  });
});
