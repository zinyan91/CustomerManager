// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import type { BusinessPlan, BusinessPlanDebt, Collateral, CreditContract, Customer } from '../../types';

const khach: Customer = {
  Id: 1, CifKh: '9632203', FullName: 'NGÔ NHỊ ĐẠT',
} as Customer;

const hdtd: CreditContract = {
  Id: 10, CustomerId: 1, HdtdNumber: '2002/HĐTD/9632203',
} as CreditContract;

const tsdb: Collateral = {
  Id: 5, CustomerId: 1, AppraisedValue: 2_000_000_000, LtvPercent: 80,
  AppraisalDate: '2026-07-01', AppraisalTenorMonths: 12,
} as Collateral;

const phuongAn: BusinessPlan = {
  Id: 3, CustomerId: 1, CreditContractId: 10, PlanKind: 'limit',
  ActualYear: 2025, PlanYear: 2026, BalanceSheetDate: '2025-06-30',
  Cash: 300_000_000, Inventory: 100_000_000, Receivables: 50_000_000, OtherCurrentAssets: 0,
  LongTermReceivables: 0, FixedAssets: 50_000_000, OtherLongTermAssets: 0,
  ShortTermDebt: 0, OtherShortTermDebt: 0, LongTermDebt: 0, OtherLongTermDebt: 0,
  ActualRevenueAnnual: 1_200_000_000, ActualCogsRatioPercent: 65,
  ActualDepreciationAnnual: 120_000_000, ActualTaxAnnual: 0,
  ActualStaffMonthly: 5_000_000, ActualPremisesMonthly: 0,
  ActualUtilitiesMonthly: 1_000_000, ActualOtherMonthly: 0,
  PlanRevenueAnnual: 1_320_000_000, PlanCogsRatioPercent: 65,
  PlanDepreciationAnnual: 120_000_000, PlanTaxAnnual: 0,
  PlanStaffMonthly: 5_000_000, PlanPremisesMonthly: 0,
  PlanUtilitiesMonthly: 1_000_000, PlanOtherMonthly: 0,
  RequestedLimitActual: 300_000_000, RequestedLimitPlan: 300_000_000,
  OtherIncomeMonthly: 0, LivingExpenseMonthly: 0, ExistingDebtPaymentMonthly: 0, MaxDtiPercent: 60,
  ProjectCost: 0, OwnFunds: 0, TenorMonths: 0, RateAnnualPercent: 0,
  UpdatedAt: '2026-08-01T00:00:00Z',
};

const duNo: BusinessPlanDebt[] = [
  { Id: 1, PlanId: 3, Label: 'VB_HM hiện hữu', Principal: 600_000_000, RateAnnualPercent: 8, Scope: 'both', SortOrder: 0 },
];

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: vi.fn(async () => [khach]),
  fetchBusinessPlansAPI: vi.fn(async () => [phuongAn]),
  fetchBusinessPlanDebtsAPI: vi.fn(async () => duNo),
  saveBusinessPlanAPI: vi.fn(async () => phuongAn),
  deleteBusinessPlanAPI: vi.fn(async () => undefined),
  fetchCollateralsByCustomerAPI: vi.fn(async () => [tsdb]),
  fetchCreditContractsByCustomerAPI: vi.fn(async () => [hdtd]),
}));

import { BusinessPlanView } from '../views/BusinessPlanView';
import { WorkProvider, useWork } from '../../context/WorkContext';
import { ThemeProvider } from '../../context/ThemeContext';

const ChonKhachHang: React.FC<{ id: number }> = ({ id }) => {
  const { setSelectedCustomerId } = useWork();
  useEffect(() => { setSelectedCustomerId(id); }, [id, setSelectedCustomerId]);
  return null;
};

function dungLen(customerId?: number) {
  return render(
    <ThemeProvider>
      <WorkProvider>
        {customerId ? <ChonKhachHang id={customerId} /> : null}
        <BusinessPlanView />
      </WorkProvider>
    </ThemeProvider>
  );
}

let loiRender: string[] = [];

beforeEach(() => {
  loiRender = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    loiRender.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BusinessPlanView — tab phương án kinh doanh dựng được lên', () => {
  it('render được khi chưa chọn khách hàng nào', () => {
    dungLen();
    expect(loiRender).toEqual([]);
  });

  it('chọn khách hàng thì hiện danh sách phương án', async () => {
    dungLen(1);
    await waitFor(() => {
      expect(screen.getByText(/Cấp hạn mức tín dụng · 2025 → 2026/)).toBeTruthy();
    });
    expect(loiRender).toEqual([]);
  });

  it('mở phương án thì dựng đủ form và bảng kết quả, không trắng trang', async () => {
    dungLen(1);
    const row = await screen.findByText(/Cấp hạn mức tín dụng · 2025 → 2026/);
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Nhu cầu cấp hạn mức')).toBeTruthy();
    });

    expect(screen.getByText('Bảng cân đối')).toBeTruthy();
    expect(screen.getByText('Kết quả kinh doanh')).toBeTruthy();
    expect(screen.getByText('Dư nợ và lãi vay')).toBeTruthy();
    expect(screen.getByText('Đề nghị cấp hạn mức')).toBeTruthy();
    expect(screen.getByText(/Xuất 3 phụ lục/)).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('lập phương án mới dựng được form rỗng', async () => {
    dungLen(1);
    const button = await screen.findByText(/Lập phương án mới/);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Thông tin chung')).toBeTruthy();
    });
    expect(loiRender).toEqual([]);
  });
});
