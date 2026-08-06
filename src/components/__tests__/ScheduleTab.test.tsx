// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoanContract, RepaymentSchedule } from '../../types';

import { ScheduleTab } from '../portfolio/ScheduleTab';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';

const kunn = {
  Id: 1047, CustomerId: 1,
  ContractNumber: '2002/HĐTD/9632203/GNN-01',
  ContractType: 0,
  LoanAmount: 500_000_000,
  ContractAmount: 500_000_000,
  DisbursementDate: '2026-01-08',
  KunnTenor: '12 tháng',
  InterestRate: 0.095,
  PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
} as LoanContract;

const ky = (over: Partial<RepaymentSchedule>): RepaymentSchedule => ({
  Id: 1, ContractId: 1047, PeriodNumber: 1,
  DueDate: '2026-02-08',
  PrincipalAmount: 0,
  InterestAmount: 4_000_000,
  ...over,
} as unknown as RepaymentSchedule);

const lich: RepaymentSchedule[] = [
  ky({ Id: 1, PeriodNumber: 1, DueDate: '2026-02-08', IsPaid: true }),
  ky({ Id: 2, PeriodNumber: 2, DueDate: '2026-07-08', OverdueInterestAmount: 0 }),
  ky({ Id: 3, PeriodNumber: 3, DueDate: '2026-12-08', PrincipalAmount: 500_000_000 }),
];

function dungLen(schedules: RepaymentSchedule[] = lich, contract: LoanContract | null = kunn) {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <ScheduleTab
          contracts={[kunn]}
          selectedContract={contract}
          handleSelectContract={() => {}}
          schedules={schedules}
          openPaymentModal={() => {}}
        />
      </LanguageProvider>
    </ThemeProvider>
  );
}

let loiRender: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-08-06T03:00:00Z'));
  loiRender = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    loiRender.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ScheduleTab dựng được lên', () => {
  it('render tới cùng khi chưa chọn hợp đồng', () => {
    dungLen([], null);
    expect(screen.getByText('Lịch thu nợ')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('render tới cùng với lịch có kỳ đã thu, kỳ quá hạn và kỳ chưa tới hạn', () => {
    dungLen();
    expect(screen.getByText('Đã thu đủ')).toBeTruthy();
    expect(screen.getAllByText('Quá hạn').length).toBeGreaterThan(0);
    expect(screen.getByText('Chờ thu')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('phiếu nghĩa vụ đổi theo kỳ được chọn', async () => {
    const user = userEvent.setup();
    dungLen();

    const radios = screen.getAllByRole('radio');
    await user.click(radios[2]);

    const slab = screen.getByText('Còn phải thu').parentElement!;
    expect(within(slab).getByText('504.000.000')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('số tiền trên phiếu dùng lớp num-slab, không dùng cỡ chữ tuỳ biến bị .font-mono ép về 12px', () => {
    dungLen();
    const slab = document.querySelector('.num-slab');
    expect(slab).toBeTruthy();
    expect(slab!.className).toContain('font-mono');
    expect(document.querySelector('.num-lead')).toBeTruthy();
    expect(document.querySelector('[class*="text-[calc("]')).toBeNull();
  });

  it('đã thu một khoản rất nhỏ thì hiện <1% chứ không hiện 0%', () => {
    dungLen([ky({ Id: 9, PeriodNumber: 9, DueDate: '2026-07-08', InterestAmount: 4_000_000, ActualPaidInterest: 2_592, OverdueInterestAmount: 0 })]);
    expect(screen.getByText(/<1%/)).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('tổng ở chân bảng bằng tổng phần còn nợ của các dòng, kể cả kỳ miễn phạt', () => {
    dungLen();
    const foot = document.querySelector('tfoot')!;
    expect(within(foot).getByText('508.000.000')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });
});
