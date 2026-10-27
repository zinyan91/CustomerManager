// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import type { Customer, LoanContract, CreditContract } from '../../types';

const khach: Customer = {
  Id: 1, CifKh: '9632203', FullName: 'NGÔ NHỊ ĐẠT',
} as Customer;

const hdtd: CreditContract = {
  Id: 10, CustomerId: 1,
  HdtdNumber: '2002/HĐTD/9632203',
  LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 3_000_000_000,
  ContractStartDate: '2026-03-15',
  ContractEndDate: '2027-03-15',
} as CreditContract;

const kunn = (id: number, so: string, tien: number): LoanContract => ({
  Id: id, CustomerId: 1, CreditContractId: 10,
  ContractNumber: so, ContractType: 0,
  LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 3_000_000_000,
  LoanAmount: tien, CurrentBalance: tien,
  DisbursementDate: '2026-05-08',
  KunnDueDate: '2026-09-23',
  KunnTenor: '5 tháng',
  RepaymentStartDate: '2026-06-15',
  InterestRate: 0.095,
  PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
  DebtGroup: 1,
} as LoanContract);

const danhSachKunn = [
  kunn(1047, '2002/HĐTD/9632203/GNN-01', 500_000_000),
  kunn(1048, '2002/HĐTD/9632203/GNN-02', 400_000_000),
  { ...kunn(1049, 'KHAC/GNN-01', 100_000_000), CreditContractId: 11 },
];

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: vi.fn(async () => [khach]),
  fetchPledgeLoanBundleByCustomerAPI: async () => ({ loans: [], links: [], repayments: [] }),
  fetchContractsByCustomerAPI: vi.fn(async () => danhSachKunn),
  fetchCollateralsByCustomerAPI: vi.fn(async () => []),
  fetchCreditContractsByCustomerAPI: vi.fn(async () => [hdtd, { ...hdtd, Id: 11, HdtdNumber: 'HDTD-B' }, { ...hdtd, Id: 12, HdtdNumber: 'HDTD-EMPTY' }]),
  fetchCardContractsByCustomerAPI: vi.fn(async () => []),
  fetchRepaymentSchedulesAPI: vi.fn(async () => []),
  saveContractAPI: vi.fn(),
  deleteContractAPI: vi.fn(),
  bulkSaveRepaymentSchedulesAPI: vi.fn(),
  deleteRepaymentSchedulesByContractAPI: vi.fn(),
}));

import { LoanPortfolioView } from '../views/LoanPortfolioView';
import { ThemeProvider } from '../../context/ThemeContext';
import { LanguageProvider } from '../../context/LanguageContext';

function dungLen(customerId?: number) {
  const duongDan = customerId ? `/customers/${customerId}/loans` : '/loans';
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <ThemeProvider>
        <LanguageProvider>
        <Routes>
          <Route path="/loans" element={<LoanPortfolioView />} />
          <Route path="/customers/:customerId/loans" element={<LoanPortfolioView />} />
        </Routes>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
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

describe('LoanPortfolioView — tab KUNN dựng được lên', () => {
  it('filters linked HĐTD in both the KUNN list and the selected repayment schedule', async () => {
    dungLen(1);
    await screen.findByText('KHAC/GNN-01');
    fireEvent.click(await screen.findByRole('button', { name: /HDTD-B.*1 KUNN/ }));
    expect(screen.queryByText('2002/HĐTD/9632203/GNN-01')).toBeNull();
    fireEvent.click(screen.getByText('KHAC/GNN-01'));
    fireEvent.click(screen.getByRole('button', { name: /Lịch trả nợ KUNN/ }));
    await screen.findByText('Khế ước nhận nợ');
    fireEvent.click(screen.getByRole('button', { name: /2002\/HĐTD\/9632203.*2 KUNN/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lịch trả nợ KUNN/ }).textContent).toContain('2002/HĐTD/9632203/GNN-01');
    });
    expect(screen.queryByText('KHAC/GNN-01')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /HDTD-EMPTY.*0 KUNN/ }));
    expect(screen.queryByText('Khế ước nhận nợ')).toBeNull();
    expect(screen.getByRole('button', { name: 'Danh sách KUNN (0)' })).toBeTruthy();
  });

  it('render được khi chưa chọn khách hàng nào', () => {
    dungLen();
    expect(loiRender).toEqual([]);
  });

  it('chọn khách hàng thì hiện danh sách KUNN, không trắng trang', async () => {
    dungLen(1);

    await waitFor(() => {
      expect(screen.getByText('2002/HĐTD/9632203/GNN-01')).toBeTruthy();
    });

    expect(screen.getByText('2002/HĐTD/9632203/GNN-02')).toBeTruthy();
  });

  it('không ném lỗi runtime nào trong lúc render', async () => {
    dungLen(1);

    await waitFor(() => {
      expect(screen.getByText('2002/HĐTD/9632203/GNN-01')).toBeTruthy();
    });

    const nghiemTrong = loiRender.filter(
      m => /ReferenceError|Cannot access|is not defined|is not a function/.test(m)
    );
    expect(nghiemTrong).toEqual([]);
  });
});
