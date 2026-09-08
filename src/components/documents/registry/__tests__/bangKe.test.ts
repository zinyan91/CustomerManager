import { it, expect } from 'vitest';
import { buildPurchaseStatementDocHtml } from '../../../../lib/inventoryExport';
import type { StatementItem, StatementSellerInfo } from '../../../../lib/statement';
import { emptyCommon } from '../types';
import { bangKeTemplate, bangKeToStatement } from '../templates/bangKe';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '', cccdPlace: '',
    address: 'Q10, TP.HCM', birthYear: '' };
  c.bank = { owner: 'TRẦN THỊ PHƯƠNG', accNo: '0123456789', name: 'Vietcombank', branch: 'TP.HCM' };
  c.items = [
    { id: '1', name: 'Lúa Jasmine', unit: 'Tấn', quantity: 25, price: 8500000, note: 'vụ ĐX' },
    { id: '2', name: 'Gạo ST25', unit: 'Tấn', quantity: 15, price: 22000000 },
  ];
  return c;
}

it('bangKeToStatement maps common → statement items + seller info', () => {
  const { items, info } = bangKeToStatement(sampleCommon());
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({ itemName: 'Lúa Jasmine', unit: 'Tấn', qty: 25, unitPrice: 8500000 });
  expect(info.sellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(info.buyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(info.buyerIdCard).toBe('0343 0300 4676');
  expect(info.bankAccNo).toBe('0123456789');
  expect(info.paymentMethod).toBe('transfer');
});

it('bangKeToStatement supports cash payment method', () => {
  const { info } = bangKeToStatement(sampleCommon(), { paymentMethod: 'cash' });
  expect(info.paymentMethod).toBe('cash');
});

it('is marked standalone and buildHtml equals the reused statement builder (golden)', () => {
  expect(bangKeTemplate.standalone).toBe(true);
  const common = sampleCommon();
  const expectedItems: StatementItem[] = [
    { id: '1', dateStr: '2026-04-09', itemName: 'Lúa Jasmine', unit: 'Tấn', qty: 25, unitPrice: 8500000, note: 'vụ ĐX' },
    { id: '2', dateStr: '2026-04-09', itemName: 'Gạo ST25', unit: 'Tấn', qty: 15, unitPrice: 22000000, note: '' },
  ];
  const expectedInfoTransfer: StatementSellerInfo = {
    sellerName: 'TRẦN THỊ PHƯƠNG', sellerAddress: 'Q10, TP.HCM', sellerBankAcc: '',
    sellerIdCard: '0791 7802 5859', buyerName: 'NGÔ NHỊ ĐẠT', buyerIdCard: '0343 0300 4676',
    statementDateStr: '2026-04-09', paymentMethod: 'transfer',
    bankAccNo: '0123456789', bankName: 'Vietcombank', bankOwner: 'TRẦN THỊ PHƯƠNG', bankBranch: 'TP.HCM',
  };
  const expectedTransfer = buildPurchaseStatementDocHtml(expectedItems, expectedInfoTransfer);
  expect(bangKeTemplate.buildHtml(common, { paymentMethod: 'transfer' })).toBe(expectedTransfer);

  const expectedInfoCash: StatementSellerInfo = {
    ...expectedInfoTransfer,
    paymentMethod: 'cash',
  };
  const expectedCash = buildPurchaseStatementDocHtml(expectedItems, expectedInfoCash);
  expect(bangKeTemplate.buildHtml(common, { paymentMethod: 'cash' })).toBe(expectedCash);
});
