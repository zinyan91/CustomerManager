import { it, expect } from 'vitest';
import { emptyCommon } from '../types';
import { paymentRequestBangKeTemplate, paymentBangKeToLegacyParams } from '../templates/paymentRequestBangKe';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.totalAmount = '212.500.000';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '079090123456', cccdDate: '25/05/2023', cccdPlace: 'CCS', address: '', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '079178025859', cccdDate: '29/11/2021', cccdPlace: 'Bộ Công An', address: '', birthYear: '' };
  c.bank = { owner: 'TRẦN THỊ PHƯƠNG', accNo: '0123456789', name: 'Vietcombank', branch: 'Chi nhánh TP.HCM' };
  c.items = [{ id: '1', name: 'Lúa giống', unit: 'Tấn', quantity: 25, price: 8500000 }];
  c.stages = [];
  return c;
}

const sampleSpecific = {
  payMethodType: 'transfer' as const,
  recipientTitle: 'Ông' as const,
  cashName: '',
  cashCccd: '',
  cashCccdDate: '',
  cashCccdPlace: '',
};

it('paymentBangKeToLegacyParams maps shared items, parties and bank info', () => {
  const d = paymentBangKeToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.saleBuyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.saleSellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.saleItems).toHaveLength(1);
  expect(d.payBankOwner).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.payMethodType).toBe('transfer');
  expect(d.recipientTitle).toBe('Ông');
});

it('buildHtml creates document referencing Bảng kê and single payment when stages is empty', () => {
  const common = sampleCommon();
  const html = paymentRequestBangKeTemplate.buildHtml(common, sampleSpecific);
  expect(html).toContain('Bảng kê mua bán hàng hóa');
  expect(html).toContain('lập ngày <strong>09/04/2026</strong>');
  expect(html).toContain('1. Giá trị bảng kê: <strong>212.500.000 đồng</strong>');
  expect(html).toContain('Thanh toán một lần');
  expect(html).toContain('TRẦN THỊ PHƯƠNG');
  expect(html).toContain('0123456789');
  expect(html).toContain('Vietcombank');
});

it('buildHtml outputs cash info when payMethodType is cash', () => {
  const common = sampleCommon();
  const cashSpecific = {
    ...sampleSpecific,
    payMethodType: 'cash' as const,
    cashName: 'TRẦN THỊ PHƯƠNG',
    cashCccd: '079178025859',
    cashCccdDate: '29/11/2021',
    cashCccdPlace: 'Bộ Công An',
  };
  const html = paymentRequestBangKeTemplate.buildHtml(common, cashSpecific);
  expect(html).toContain('Thanh toán tiền mặt');
  expect(html).toContain('079178025859');
  expect(html).toContain('Bộ Công An');
});
