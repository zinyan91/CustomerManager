// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MultiSettlementModal } from '../MultiSettlementModal';
import { buildSettlementLine, settlementTotals } from '../../../lib/multiSettlement';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../../types';

afterEach(cleanup);

const ccs = [{ Id: 1, LoanMethod: 'Hạn mức tín dụng' }, { Id: 2, LoanMethod: 'Cho vay từng lần' }] as CreditContract[];
const kunn = (Id: number, CreditContractId: number): LoanContract => ({
  Id, CustomerId: 1, ContractNumber: `KUNN-${Id}`, ContractType: 1, CreditContractId,
  LoanAmount: 100_000_000, CurrentBalance: 100_000_000, InterestRate: 12, DisbursementDate: '2026-01-10',
} as LoanContract);
const lich = (ContractId: number): RepaymentSchedule[] => [
  { Id: ContractId * 10, ContractId, PeriodNumber: 1, DueDate: '2026-12-10', PrincipalAmount: 100_000_000, InterestAmount: 0, TotalAmount: 100_000_000, IsPaid: false } as RepaymentSchedule,
];

function dung() {
  const lines = [
    buildSettlementLine({ contract: kunn(1, 1), schedules: lich(1), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs),
    buildSettlementLine({ contract: kunn(2, 2), schedules: lich(2), settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs),
    buildSettlementLine({ contract: kunn(3, 2), schedules: undefined, settlementDate: '2026-11-10', penaltyOverridePercent: null }, ccs),
  ];
  const drafts = Object.fromEntries(lines.map(l => [l.contract.Id, { selected: true, settlementDate: '2026-11-10', penaltyInput: '' }]));
  const onChangeDraft = vi.fn();
  const onConfirm = vi.fn();
  const onApplyDate = vi.fn();
  render(
    <MultiSettlementModal isOpen lines={lines} drafts={drafts} totals={settlementTotals(lines)} failures={{}}
      isSubmitting={false} onChangeDraft={onChangeDraft} onSelectAll={vi.fn()} onApplyDateToSelected={onApplyDate} onClose={vi.fn()} onConfirm={onConfirm} />
  );
  return { onChangeDraft, onConfirm, onApplyDate };
}

describe('MultiSettlementModal', () => {
  it('mỗi khoản một dòng với hình thức vay và lý do phí; dòng TỔNG CỘNG ở cuối bảng', () => {
    dung();
    expect(screen.getByText('Miễn phí (hạn mức)')).toBeTruthy();
    expect(screen.getAllByText('Năm thứ 1: 4%')).toHaveLength(2);
    const rows = screen.getAllByRole('row');
    expect(rows[rows.length - 1].textContent).toContain('TỔNG CỘNG (2 khoản)');
  });

  it('khoản bị chặn hiện lý do ngay tại dòng và không tính vào nút tất toán', () => {
    dung();
    expect(screen.getByRole('alert').textContent).toContain('Chưa tải được lịch trả nợ');
    expect(screen.getByRole('button', { name: 'Tất toán 2 khoản' })).toBeTruthy();
  });

  it('bấm áp ngày tất toán chung gửi ngày đó lên trên', () => {
    const { onApplyDate } = dung();
    fireEvent.click(screen.getByRole('button', { name: 'Áp cho các khoản đã chọn' }));
    expect(onApplyDate).toHaveBeenCalledTimes(1);
  });

  it('đổi tỷ lệ phí và bỏ chọn một khoản báo lên trên', () => {
    const { onChangeDraft } = dung();
    fireEvent.change(screen.getByLabelText('Phí trả trước (%) của KUNN-2'), { target: { value: '2' } });
    expect(onChangeDraft).toHaveBeenCalledWith(2, { penaltyInput: '2' });
    fireEvent.click(screen.getByLabelText('Chọn KUNN-1'));
    expect(onChangeDraft).toHaveBeenCalledWith(1, { selected: false });
  });
});
