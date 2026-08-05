// @vitest-environment jsdom

/*
 * Test khói cho tab KUNN.
 *
 * Lý do có tệp này: 05/08/2026 tab KUNN trắng trang mỗi lần chọn khách hàng vì
 * getEffectiveBalanceForContract gọi kunnSettled khai sau nó 11 dòng, còn
 * limitGroups gọi hàm đó ngay lúc render nên ném ReferenceError. Build, lint và
 * 668 test logic đều xanh — không lớp nào trong số đó dựng component lên.
 *
 * Vì vậy bài test ở đây KHÔNG kiểm công thức tiền (đã có test hàm thuần lo).
 * Nó chỉ khẳng định một điều mà chỉ nó khẳng định được: chọn khách hàng thì
 * component render tới cùng, không ném lỗi runtime.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
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
];

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: vi.fn(async () => [khach]),
  fetchContractsByCustomerAPI: vi.fn(async () => danhSachKunn),
  fetchCollateralsByCustomerAPI: vi.fn(async () => []),
  fetchCreditContractsByCustomerAPI: vi.fn(async () => [hdtd]),
  fetchRepaymentSchedulesAPI: vi.fn(async () => []),
  saveContractAPI: vi.fn(),
  deleteContractAPI: vi.fn(),
  bulkSaveRepaymentSchedulesAPI: vi.fn(),
  deleteRepaymentSchedulesByContractAPI: vi.fn(),
}));

import { LoanPortfolioView } from '../views/LoanPortfolioView';
import { WorkProvider, useWork } from '../../context/WorkContext';
import { ThemeProvider } from '../../context/ThemeContext';

/* Đúng đường đã làm trắng trang: một tab khác đẩy khách hàng sang qua
   WorkContext, LoanPortfolioView tự nạp dữ liệu rồi render danh sách KUNN. */
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
        <LoanPortfolioView />
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

describe('LoanPortfolioView — tab KUNN dựng được lên', () => {
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

    /* ReferenceError của lần trắng trang đi ra qua console.error của React
       trước khi cây component bị bỏ. Bắt ở đây để lần sau không lọt nữa. */
    const nghiemTrong = loiRender.filter(
      m => /ReferenceError|Cannot access|is not defined|is not a function/.test(m)
    );
    expect(nghiemTrong).toEqual([]);
  });
});
