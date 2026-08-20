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

    expect(document.querySelector('.num-lead')!.textContent).toBe('3');

    const phieu = document.querySelectorAll('tfoot')[1];
    expect(within(phieu).getAllByText('504.000.000')).toHaveLength(2);
    expect(within(phieu).getByText('–')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });

  it('số kỳ dùng lớp num-lead, không dùng cỡ chữ tuỳ biến bị .font-mono ép về 12px', () => {
    dungLen();
    const lead = document.querySelector('.num-lead');
    expect(lead).toBeTruthy();
    expect(lead!.className).toContain('font-mono');
    expect(document.querySelector('[class*="text-[calc("]')).toBeNull();
  });

  it('tổng ở chân bảng bằng tổng phần còn nợ của các dòng, kể cả kỳ miễn phạt', () => {
    dungLen();
    const foot = document.querySelector('tfoot')!;
    expect(within(foot).getByText('508.000.000')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });
});

describe('cột Ghi nhận và thao tác', () => {

  it('bảng còn 8 cột — ô chọn kỳ gộp vào cột Kỳ, không chiếm cột riêng', () => {
    dungLen();
    const table = document.querySelector('table')!;
    expect(table.querySelectorAll('thead th')).toHaveLength(8);
    const cot1 = table.querySelector('tbody tr td:first-child')!;
    expect(cot1.querySelector('input[type=radio]')).toBeTruthy();
    expect(cot1.textContent).toContain('1');
  });

  it('vẫn chọn được kỳ bằng ô radio sau khi gộp cột', async () => {
    const user = userEvent.setup();
    dungLen();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    await user.click(radios[1]);
    expect(document.querySelector('.num-lead')!.textContent).toBe('2');
  });

  it('mỗi dòng có đúng một nút Ghi nhận và bấm được', async () => {
    const user = userEvent.setup();
    const goi: number[] = [];
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ScheduleTab
            contracts={[kunn]}
            selectedContract={kunn}
            handleSelectContract={() => {}}
            schedules={lich}
            openPaymentModal={(s: RepaymentSchedule) => goi.push(s.PeriodNumber)}
          />
        </LanguageProvider>
      </ThemeProvider>
    );
    const nut = screen.getAllByRole('button', { name: 'Ghi nhận' });
    expect(nut).toHaveLength(3);
    await user.click(nut[2]);
    expect(goi).toEqual([3]);
  });

  it('nút Thu nhanh sáng khi có kỳ đến hạn chưa thanh toán và bấm được', async () => {
    const user = userEvent.setup();
    const onQuickSettleAll = vi.fn();
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ScheduleTab
            contracts={[kunn]}
            selectedContract={kunn}
            handleSelectContract={() => {}}
            schedules={lich}
            openPaymentModal={() => {}}
            onQuickSettleAll={onQuickSettleAll}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const nutThuNhanh = screen.getByRole('button', { name: /Thu nhanh/ });
    expect(nutThuNhanh).toBeTruthy();
    expect((nutThuNhanh as HTMLButtonElement).disabled).toBe(false);

    await user.click(nutThuNhanh);
    expect(onQuickSettleAll).toHaveBeenCalledTimes(1);
  });

  it('nút Thu nhanh bị disable khi toàn bộ kỳ đã thu hoặc chưa tới hạn', () => {
    const allPaid = [
      ky({ Id: 1, PeriodNumber: 1, DueDate: '2026-02-08', IsPaid: true }),
      ky({ Id: 2, PeriodNumber: 2, DueDate: '2026-07-08', IsPaid: true }),
    ];

    render(
      <ThemeProvider>
        <LanguageProvider>
          <ScheduleTab
            contracts={[kunn]}
            selectedContract={kunn}
            handleSelectContract={() => {}}
            schedules={allPaid}
            openPaymentModal={() => {}}
            onQuickSettleAll={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const nutThuNhanh = screen.getByRole('button', { name: /Thu nhanh/ });
    expect((nutThuNhanh as HTMLButtonElement).disabled).toBe(true);
  });
});
