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
          selectedContract={contract}
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
    expect(within(foot).getByText('508.031.781')).toBeTruthy();
    expect(loiRender).toEqual([]);
  });
});

describe('cột Ghi nhận và thao tác', () => {

  it('bảng 11 cột: Gốc, Lãi, Lãi phạt đứng ngay trước Phải thu; ô chọn kỳ gộp vào cột Kỳ', () => {
    dungLen();
    const table = document.querySelector('table')!;
    const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    expect(heads).toHaveLength(11);
    const i = heads.indexOf('Phải thu');
    expect(heads.slice(i - 3, i + 1)).toEqual(['Gốc', 'Lãi', 'Lãi phạt', 'Phải thu']);
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
            selectedContract={kunn}
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
            selectedContract={kunn}
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
            selectedContract={kunn}
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

  it('passes the selected 1–9 day delay to quick collection', async () => {
    const user = userEvent.setup();
    const collect = vi.fn();
    render(<ThemeProvider><LanguageProvider>
      <ScheduleTab selectedContract={kunn} schedules={lich} openPaymentModal={() => {}} onQuickSettleAll={collect} />
    </LanguageProvider></ThemeProvider>);
    const select = screen.getByRole('combobox', { name: 'Ngày thu nhanh' });
    expect(within(select).getAllByRole('option')).toHaveLength(10);
    await user.selectOptions(select, '9');
    await user.click(screen.getByRole('button', { name: /Thu nhanh/ }));
    expect(collect).toHaveBeenCalledWith(9);
  });

  it('nút Tất toán trước hạn hiển thị và gọi onOpenEarlySettlement khi khoản vay còn nợ', async () => {
    const user = userEvent.setup();
    const onOpenEarlySettlement = vi.fn();

    render(
      <ThemeProvider>
        <LanguageProvider>
          <ScheduleTab
            selectedContract={kunn}
            schedules={lich}
            openPaymentModal={() => {}}
            onOpenEarlySettlement={onOpenEarlySettlement}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const nutTatToan = screen.getByRole('button', { name: /Tất toán trước hạn/ });
    expect(nutTatToan).toBeTruthy();
    expect((nutTatToan as HTMLButtonElement).disabled).toBe(false);

    await user.click(nutTatToan);
    expect(onOpenEarlySettlement).toHaveBeenCalledTimes(1);
  });

  it('nút Tất toán trước hạn bị disable khi hợp đồng đã tất toán', () => {
    const settledKunn = { ...kunn, IsSettled: true, CurrentBalance: 0 };

    render(
      <ThemeProvider>
        <LanguageProvider>
          <ScheduleTab
            selectedContract={settledKunn}
            schedules={lich}
            openPaymentModal={() => {}}
            onOpenEarlySettlement={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const nutTatToan = screen.getByRole('button', { name: /Tất toán trước hạn/ });
    expect((nutTatToan as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('đầu tab chỉ hiện KUNN đang chọn', () => {
  it('ghi số KUNN đang chọn, không còn hàng nút chọn KUNN khác', () => {
    dungLen();
    expect(screen.getByText('Khế ước nhận nợ')).toBeTruthy();
    expect(screen.getByText(kunn.ContractNumber)).toBeTruthy();
    expect(screen.queryByText('Hợp đồng tín dụng')).toBeNull();
    expect(screen.queryAllByRole('button').some(b => b.textContent?.includes(kunn.ContractNumber))).toBe(false);
  });

  it('KUNN đã tất toán có nhãn Đã tất toán', () => {
    dungLen(lich, { ...kunn, IsSettled: true, CurrentBalance: 0 });
    expect(screen.getByText('Đã tất toán')).toBeTruthy();
  });
});

describe('ScheduleTab — tách gốc, lãi, lãi phạt để đối chiếu', () => {
  it('mỗi kỳ và dòng tổng hiện riêng gốc, lãi, lãi phạt; tổng = gốc + lãi + lãi phạt', () => {
    const rows = [
      ky({ Id: 1, PeriodNumber: 1, DueDate: '2026-02-08', IsPaid: true, PrincipalAmount: 15_850_000, InterestAmount: 18_583_562 }),
      ky({ Id: 2, PeriodNumber: 2, DueDate: '2026-03-08', IsPaid: true, PrincipalAmount: 0, InterestAmount: 22_108_663, OverdueInterestAmount: 120_000, OverdueDays: 3, PaymentDate: '2026-03-11', ActualPaidInterest: 22_228_663 }),
    ];
    dungLen(rows);
    const table = document.querySelector('table')!;
    const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    const col = (name: string) => heads.indexOf(name);
    const r1 = table.querySelectorAll('tbody tr')[0].querySelectorAll('td');
    expect(r1[col('Gốc')].textContent).toBe('15.850.000');
    expect(r1[col('Lãi')].textContent).toBe('18.583.562');
    expect(r1[col('Lãi phạt')].textContent).toBe('–');
    expect(r1[col('Phải thu')].textContent).toBe('34.433.562');
    const r2 = table.querySelectorAll('tbody tr')[1].querySelectorAll('td');
    expect(r2[col('Gốc')].textContent).toBe('–');
    expect(r2[col('Lãi phạt')].textContent).toBe('120.000');
    const foot = Array.from(table.querySelectorAll('tfoot td')).map(td => td.textContent);
    expect(foot).toContain('15.850.000');
    expect(foot).toContain('40.692.225');
    expect(foot).toContain('120.000');
    expect(foot).toContain('56.662.225');
  });
});
