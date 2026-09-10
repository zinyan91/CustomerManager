// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisbursementPayeePicker } from '../DisbursementPayeePicker';
import type { DisbursementPayee } from '../../../lib/disbursementDb';

afterEach(cleanup);

const PAYEES: DisbursementPayee[] = [
  {
    Id: 'payee-1',
    FullName: 'NGUYỄN VĂN AN',
    NationalId: '079090001111',
    IdCardIssueDate: '2023-05-10',
    IdCardIssuePlace: 'CCS QLHC về TTXH',
    AccountNumber: '1029384756',
    BankName: 'Vietcombank',
    BankBranch: 'CN Sài Gòn',
  },
  {
    Id: 'payee-2',
    FullName: 'TRẦN THỊ BÍCH',
    NationalId: '079180002222',
    IdCardIssueDate: '2022-01-15',
    IdCardIssuePlace: 'Bộ Công An',
    AccountNumber: '9876543210',
    BankName: 'BIDV',
    BankBranch: 'CN Chợ Lớn',
  },
];

describe('DisbursementPayeePicker Component', () => {
  it('renders placeholder when no payee is selected', () => {
    render(
      <DisbursementPayeePicker
        payees={PAYEES}
        selectedPayeeId={null}
        onSelectPayee={() => {}}
      />
    );
    expect(screen.getByText('— Chọn từ Thông tin giải ngân —')).toBeTruthy();
  });

  it('renders selected payee name and account info in trigger', () => {
    render(
      <DisbursementPayeePicker
        payees={PAYEES}
        selectedPayeeId="payee-1"
        onSelectPayee={() => {}}
      />
    );
    expect(screen.getByText(/NGUYỄN VĂN AN — STK: 1029384756 \(Vietcombank\)/i)).toBeTruthy();
  });

  it('opens popover, filters payees and allows selecting', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <DisbursementPayeePicker
        payees={PAYEES}
        selectedPayeeId={null}
        onSelectPayee={handleSelect}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Chọn Thông tin giải ngân' }));
    expect(screen.getByPlaceholderText('Tìm theo tên, CCCD, STK, ngân hàng...')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Tìm theo tên, CCCD, STK, ngân hàng...'), 'BÍCH');
    expect(screen.queryByText('NGUYỄN VĂN AN')).toBeNull();
    expect(screen.getByText('TRẦN THỊ BÍCH')).toBeTruthy();

    await user.click(screen.getByText('TRẦN THỊ BÍCH'));
    expect(handleSelect).toHaveBeenCalledWith('payee-2');
  });
});
