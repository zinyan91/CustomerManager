// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PurchaseStatementSellerCard } from '../PurchaseStatementSellerCard';
import type { StatementSellerInfo } from '../../../lib/statement';
import type { Customer } from '../../../types';

afterEach(cleanup);

describe('PurchaseStatementSellerCard', () => {
  const initialSellerInfo: StatementSellerInfo = {
    sellerName: 'LÊ THỊ HOÀNG ÂN',
    sellerAddress: 'TP.HCM',
    sellerBankAcc: 'STK: 123456 - VCB',
    sellerIdCard: '080166012861',
    buyerName: 'NGUYỄN THÙY DUNG',
    buyerIdCard: '051188004003',
    buyerAddress: 'TP.HCM',
    statementDateStr: '2026-09-08',
    paymentMethod: 'transfer',
  };

  const sampleCustomers: Customer[] = [
    {
      Id: 1,
      FullName: 'NGUYỄN VĂN A',
      CifKh: 'CIF001',
      NationalId: '012345678901',
      Address: 'Hà Nội',
      MaritalStatus: 'Single',
    },
    {
      Id: 2,
      FullName: 'TRẦN THỊ B',
      CifKh: 'CIF002',
      NationalId: '098765432109',
      Address: 'Đà Nẵng',
      MaritalStatus: 'Married',
    },
  ];

  it('renders buyer inputs and toggles payment method between cash and transfer', () => {
    const onChangeSellerInfo = vi.fn();
    render(
      <PurchaseStatementSellerCard
        sellerInfo={initialSellerInfo}
        onChangeSellerInfo={onChangeSellerInfo}
        itemsCount={0}
        onSaveToDb={vi.fn()}
        onOpenHistory={vi.fn()}
        onExportExcel={vi.fn()}
        onPrint={vi.fn()}
        onOpenInventoryPicker={vi.fn()}
        onClearAllItems={vi.fn()}
      />
    );

    const buyerNameInput = screen.getByDisplayValue('NGUYỄN THÙY DUNG');
    expect(buyerNameInput).toBeTruthy();
    const buyerAddressInput = screen.getByPlaceholderText('Địa chỉ Bên mua') as HTMLInputElement;
    expect(buyerAddressInput).toBeTruthy();
    expect(buyerAddressInput.value).toBe('TP.HCM');

    const cashRadio = screen.getByLabelText(/Tiền mặt/i);
    fireEvent.click(cashRadio);
    expect(onChangeSellerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'cash' })
    );
  });

  it('allows selecting buyer from customer picker', () => {
    const onChangeSellerInfo = vi.fn();
    render(
      <PurchaseStatementSellerCard
        sellerInfo={initialSellerInfo}
        onChangeSellerInfo={onChangeSellerInfo}
        itemsCount={0}
        customers={sampleCustomers}
        onSaveToDb={vi.fn()}
        onOpenHistory={vi.fn()}
        onExportExcel={vi.fn()}
        onPrint={vi.fn()}
        onOpenInventoryPicker={vi.fn()}
        onClearAllItems={vi.fn()}
      />
    );

    const pickerTrigger = screen.getByRole('button', { name: /Chọn Khách hàng/i });
    fireEvent.click(pickerTrigger);

    const customerOption = screen.getByText('NGUYỄN VĂN A');
    fireEvent.click(customerOption);

    expect(onChangeSellerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerName: 'NGUYỄN VĂN A',
        buyerAddress: 'Hà Nội',
      })
    );
  });
});
