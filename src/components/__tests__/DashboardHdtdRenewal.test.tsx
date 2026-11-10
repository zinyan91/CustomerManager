// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { CreditContract, LoanContract } from '../../types';

const api = vi.hoisted(() => ({
  fetchCustomersStrictAPI: vi.fn(),
  fetchCollateralsStrictAPI: vi.fn(),
  fetchContractsStrictAPI: vi.fn(),
  fetchCardContractsStrictAPI: vi.fn(),
  fetchOutstandingSchedulesAPI: vi.fn(),
  fetchAllCreditContractsAPI: vi.fn(),
  fetchPaidPrincipalMapAPI: vi.fn(),
  fetchAllPledgeLoanBundlesAPI: vi.fn().mockResolvedValue({ loans: [], links: [], repayments: [], books: [] }),
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
  api.fetchCustomersStrictAPI.mockResolvedValue([{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT' }]);
  api.fetchCollateralsStrictAPI.mockResolvedValue([]);
  api.fetchContractsStrictAPI.mockResolvedValue([OLD_KUNN]);
  api.fetchCardContractsStrictAPI.mockResolvedValue([]);
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

  it('không cộng tài sản đã tất toán vào Tổng giá trị TSĐB; không đếm trùng kỳ due + KUNN quá hạn và hiện cả nợ Nhóm 2+', async () => {
    api.fetchCustomersStrictAPI.mockResolvedValue([
      { Id: 7, FullName: 'NGÔ NHỊ ĐẠT' },
      { Id: 8, FullName: 'TRẦN VĂN B' },
    ]);
    api.fetchCollateralsStrictAPI.mockResolvedValue([
      { Id: 101, CustomerId: 7, AppraisedValue: 2_000_000_000, Value: 2_000_000_000, AssetType: 'BDS_1', AppraisalDate: '2026-06-01', AppraisalTenorMonths: 12 },
      { Id: 102, CustomerId: 8, AppraisedValue: 5_000_000_000, Value: 5_000_000_000, AssetType: 'BDS_1', AppraisalDate: '2025-01-01', AppraisalTenorMonths: 12 },
    ]);
    api.fetchAllCreditContractsAPI.mockResolvedValue([
      { Id: 1, CustomerId: 7, HdtdNumber: 'HD-DANG-VAY', LoanMethod: 'Cho vay từng lần', ContractAmount: 1_000_000_000, ContractStartDate: '2025-01-01', ContractEndDate: '2027-01-01', IsClosed: false, CollateralIds: '101' },
      { Id: 2, CustomerId: 8, HdtdNumber: 'HD-DA-DONG', LoanMethod: 'Cho vay từng lần', ContractAmount: 3_000_000_000, ContractStartDate: '2024-01-01', ContractEndDate: '2025-01-01', IsClosed: true, CollateralIds: '102' },
    ]);
    api.fetchContractsStrictAPI.mockResolvedValue([
      {
        Id: 10, CustomerId: 7, CreditContractId: 1, ContractNumber: 'HD-DANG-VAY/GNN-01',
        LoanMethod: 'Cho vay từng lần', LoanAmount: 1_000_000_000, CurrentBalance: 600_000_000,
        DisbursementDate: '2025-01-05', KunnDueDate: '2026-01-01', IsSettled: false, DebtGroup: 2, CollateralIds: '101',
      } as LoanContract,
      {
        Id: 20, CustomerId: 8, CreditContractId: 2, ContractNumber: 'HD-DA-DONG/GNN-01',
        LoanMethod: 'Cho vay từng lần', LoanAmount: 3_000_000_000, CurrentBalance: 0,
        DisbursementDate: '2024-01-05', KunnDueDate: '2025-01-01', IsSettled: true, DebtGroup: 1, CollateralIds: '102',
      } as LoanContract,
    ]);
    api.fetchCardContractsStrictAPI.mockResolvedValue([]);
    api.fetchOutstandingSchedulesAPI.mockResolvedValue([
      { Id: 501, ContractId: 10, PeriodNumber: 12, DueDate: '2026-01-01', TotalAmount: 610_000_000, IsPaid: false },
    ]);
    api.fetchPaidPrincipalMapAPI.mockResolvedValue({ 10: 400_000_000, 20: 3_000_000_000 });

    render(<MemoryRouter><DashboardView /></MemoryRouter>);

    // Khoản vay #10 quá hạn > 10 ngày (Nhóm 2), có cả kỳ due quá hạn lẫn KUNN đáo hạn quá hạn:
    // phải hiện ngay ở "1. Quá hạn thu nợ" và chỉ đếm 1 khoản nợ (không đếm trùng thành 2).
    expect(await screen.findByText('1 khoản nợ')).toBeTruthy();
    // Tổng giá trị TSĐB chỉ tính tài sản 101 (2,00 Tỷ), không cộng tài sản 102 (5,00 Tỷ) của khách đã tất toán
    expect(screen.getByText('2,00 Tỷ')).toBeTruthy();
    expect(screen.queryByText('7,00 Tỷ')).toBeNull();

    // Bảng KUNN Đến Hạn hiện dư nợ còn lại (600.000.000 VNĐ) thay vì gốc giải ngân ban đầu (1.000.000.000 VNĐ)
    fireEvent.click(screen.getByText('2. KUNN Đến Hạn'));
    expect(screen.getAllByText('600.000.000 VNĐ').length).toBeGreaterThan(0);
    expect(screen.queryByText('1.000.000.000 VNĐ')).toBeNull();
  });

  it('Tổng quy mô dư nợ cộng đủ cả KUNN chưa gắn CreditContractId và không đếm KUNN đã thu hết gốc (dư nợ 0) vào số lượng khoản vay', async () => {
    api.fetchCustomersStrictAPI.mockResolvedValue([{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT' }]);
    api.fetchCollateralsStrictAPI.mockResolvedValue([]);
    api.fetchAllCreditContractsAPI.mockResolvedValue([
      { Id: 1, CustomerId: 7, HdtdNumber: 'HD-01', LoanMethod: 'Hạn mức tín dụng', ContractAmount: 3_000_000_000, ContractStartDate: '2025-01-01', ContractEndDate: '2027-01-01', IsClosed: false },
      { Id: 2, CustomerId: 7, HdtdNumber: 'HD-DONG', LoanMethod: 'Cho vay từng lần', ContractAmount: 4_200_000_000, ContractStartDate: '2024-01-01', ContractEndDate: '2026-01-01', IsClosed: true },
    ]);
    api.fetchContractsStrictAPI.mockResolvedValue([
      {
        Id: 10, CustomerId: 7, CreditContractId: 1, ContractNumber: 'HD-01/GNN-01',
        LoanMethod: 'Hạn mức tín dụng', LoanAmount: 1_500_000_000, CurrentBalance: 1_500_000_000,
        DisbursementDate: '2025-01-05', KunnDueDate: '2027-01-01', IsSettled: false, DebtGroup: 1,
      } as LoanContract,
      {
        // KUNN mồ côi CreditContractId (chưa có HĐTD cha trong danh sách) nhưng còn dư nợ 800 triệu
        Id: 11, CustomerId: 7, CreditContractId: null, ContractNumber: 'HD-ROI/GNN-01',
        LoanMethod: 'Cho vay từng lần', LoanAmount: 1_000_000_000, CurrentBalance: 800_000_000,
        DisbursementDate: '2025-02-05', KunnDueDate: '2027-02-01', IsSettled: false, DebtGroup: 1,
      } as LoanContract,
      {
        // KUNN chưa tích IsSettled nhưng đã thu đủ 100% gốc trong ContractPaidPrincipal -> dư nợ = 0
        Id: 12, CustomerId: 7, CreditContractId: 1, ContractNumber: 'HD-01/GNN-02',
        LoanMethod: 'Hạn mức tín dụng', LoanAmount: 500_000_000, CurrentBalance: 500_000_000,
        DisbursementDate: '2025-03-05', KunnDueDate: '2027-03-01', IsSettled: false, DebtGroup: 1,
      } as LoanContract,
      {
        // KUNN thuộc HĐTD đã đóng (IsClosed = true) nhưng cờ IsSettled chưa bật -> không được cộng vào Tổng quy mô dư nợ
        Id: 13, CustomerId: 7, CreditContractId: 2, ContractNumber: 'HD-DONG/GNN-01',
        LoanMethod: 'Cho vay từng lần', LoanAmount: 4_200_000_000, CurrentBalance: 4_200_000_000,
        DisbursementDate: '2024-03-05', KunnDueDate: '2026-03-01', IsSettled: false, DebtGroup: 1,
      } as LoanContract,
    ]);
    api.fetchCardContractsStrictAPI.mockResolvedValue([]);
    api.fetchOutstandingSchedulesAPI.mockResolvedValue([]);
    api.fetchPaidPrincipalMapAPI.mockResolvedValue({ 10: 0, 11: 200_000_000, 12: 500_000_000, 13: 0 });

    render(<MemoryRouter><DashboardView /></MemoryRouter>);

    // Tổng dư nợ = 1,5 tỷ (#10) + 0,8 tỷ (#11) + 0 (#12) = 2,30 Tỷ
    expect((await screen.findAllByText('2,30 Tỷ')).length).toBeGreaterThanOrEqual(2);
    // Dòng Hạn mức tín dụng và Cho vay từng lần mỗi dòng chỉ đếm 1 khoản (#10 và #11), không đếm khoản #12 đã trả hết gốc
    expect(screen.getAllByText('(1 khoản)')).toHaveLength(2);
    expect(screen.queryByText('(2 khoản)')).toBeNull();
    // Nhóm 1 chỉ đếm 2 HĐ (#10 và #11), không đếm thành 3 HĐ
    expect(screen.getByText('(2 HĐ)')).toBeTruthy();
  });
});
