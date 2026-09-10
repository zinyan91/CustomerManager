// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LoanContract } from '../../../types';
import type { EarlySettlementQuote } from '../../../lib/loanSettlement';
import { EarlySettlementModal } from '../EarlySettlementModal';
import { LanguageProvider } from '../../../context/LanguageContext';
import { ThemeProvider } from '../../../context/ThemeContext';

const mockContract: LoanContract = {
  Id: 10,
  CustomerId: 1,
  ContractNumber: 'KUNN-TEST-99',
  ContractType: 1,
  LoanAmount: 100_000_000,
  CurrentBalance: 100_000_000,
  IsSettled: false,
};

const mockQuote: EarlySettlementQuote = {
  canSettle: true,
  contractId: 10,
  settlementDate: '2026-03-15',
  basisStartDate: '2026-03-01',
  accruedDays: 14,
  remainingPrincipal: 100_000_000,
  effectiveRatePercent: 12.0,
  accruedInterest: 460_274,
  penaltyRatePercent: 1.0,
  penaltyFee: 1_000_000,
  totalSettlementAmount: 101_460_274,
  settlingPeriodNumber: 2,
  futureScheduleIds: [20, 30],
  settledRow: null,
};

function renderModal(props: Partial<React.ComponentProps<typeof EarlySettlementModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    selectedContract: mockContract,
    settlementDate: '2026-03-15',
    setSettlementDate: vi.fn(),
    penaltyRateStr: '1',
    setPenaltyRateStr: vi.fn(),
    quote: mockQuote,
    isSubmitting: false,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <ThemeProvider>
        <LanguageProvider>
          <EarlySettlementModal {...defaultProps} />
        </LanguageProvider>
      </ThemeProvider>
    ),
    props: defaultProps,
  };
}

describe('EarlySettlementModal component', () => {
  it('hiển thị đầy đủ thông tin bảng kê và dòng TỔNG CỘNG', () => {
    renderModal();

    expect(screen.getByText(/TẤT TOÁN KHOẢN VAY TRƯỚC HẠN · KUNN-TEST-99/i)).toBeTruthy();
    expect(screen.getByText('Dư nợ gốc còn lại')).toBeTruthy();
    expect(screen.getByText('Tiền lãi dồn tích đến ngày tất toán')).toBeTruthy();
    expect(screen.getByText('Phí phạt trả nợ trước hạn')).toBeTruthy();
    expect(screen.getByText('TỔNG CỘNG NGHĨA VỤ PHẢI THU')).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: /XÁC NHẬN TẤT TOÁN KHOẢN VAY/i });
    expect(submitBtn).toBeTruthy();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('bấm chip phí phạt nhanh gọi setPenaltyRateStr', async () => {
    const user = userEvent.setup();
    const setPenaltyRateStr = vi.fn();
    renderModal({ setPenaltyRateStr });

    const chip2 = screen.getByRole('button', { name: '2%' });
    await user.click(chip2);
    expect(setPenaltyRateStr).toHaveBeenCalledWith('2');
  });

  it('bấm Xác nhận gọi onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderModal({ onConfirm });

    const submitBtn = screen.getByRole('button', { name: /XÁC NHẬN TẤT TOÁN KHOẢN VAY/i });
    await user.click(submitBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('bấm Hủy gọi onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    const cancelBtn = screen.getByRole('button', { name: 'Hủy' });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
