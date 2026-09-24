import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { saleContractTemplate, saleToLegacyParams } from '../templates/saleContract';
import { paymentRequestSaleTemplate } from '../templates/paymentRequestSale';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '', cccdDate: '', cccdPlace: '',
    address: 'Bình Đường, An Bình, Tp. Dĩ An, Bình Dương', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH', address: '', birthYear: '' };
  c.payMethod = 'cash';
  c.bank = { owner: 'TRẦN THỊ PHƯƠNG', accNo: '0123456789',
    name: 'Vietcombank', branch: 'Chi nhánh TP.HCM' };
  c.startDate = '2026-04-09';
  c.endDate = '2027-04-08';
  c.items = [
    { id: '1', name: 'Lúa Jasmine 85', unit: 'Tấn', quantity: 25, price: 8500000 },
    { id: '2', name: 'Gạo ST25', unit: 'Tấn', quantity: 15, price: 22000000 },
  ];
  c.stages = [
    { id: 's1', stageName: 'Đợt 1', amount: '100.000.000', status: 'current', note: '' },
    { id: 's2', stageName: 'Đợt 2', amount: '442.500.000', status: 'future', note: '' },
  ];
  return c;
}

it('saleToLegacyParams maps common into the right legacy fields', () => {
  const d = saleToLegacyParams(sampleCommon());
  expect(d.saleContractDate).toBe('2026-04-09');
  expect(d.saleBuyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.saleBuyerAddress).toBe('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');
  expect(d.saleSellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.saleSellerCccd).toBe('0791 7802 5859');
  expect(d.salePayMethod).toBe('cash');
  expect(d.saleBankOwner).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.saleItems).toHaveLength(2);
  expect(d.salePaymentStage1).toBe('100.000.000');
});

it('Lần 1 của HĐ là Đợt 1 của hồ sơ; chưa có đợt thì để trống', () => {
  const c = sampleCommon();
  c.stages = [];
  expect(saleToLegacyParams(c).salePaymentStage1).toBe('');
});

it('sửa Đợt 1 thì HĐ mua bán và Đề nghị thanh toán cùng đổi theo', () => {
  const c = sampleCommon();
  c.stages = [{ ...c.stages[0], amount: '120.000.000' }, c.stages[1]];
  const contract = saleContractTemplate.buildHtml(c, {});
  const request = paymentRequestSaleTemplate.buildHtml(c, {});
  expect(contract).toContain('Lần 1: Bên A thanh toán cho Bên B số tiền là: <strong>120.000.000 đồng</strong>');
  expect(request).toContain('<strong>120.000.000 đồng</strong>');
  expect(contract).not.toContain('100.000.000');
  expect(request).not.toContain('100.000.000');
});

it('buildHtml output equals the legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('sale_contract', {
    ...baseDraft(),
    saleContractDate: '2026-04-09',
    saleBuyerName: 'NGÔ NHỊ ĐẠT',
    saleBuyerAddress: 'Bình Đường, An Bình, Tp. Dĩ An, Bình Dương',
    saleSellerName: 'TRẦN THỊ PHƯƠNG',
    saleSellerCccd: '0791 7802 5859',
    saleSellerCccdDate: '29/11/2021',
    saleSellerCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    salePayMethod: 'cash',
    saleBankOwner: 'TRẦN THỊ PHƯƠNG',
    saleBankAccNo: '0123456789',
    saleBankName: 'Vietcombank',
    saleBankBranch: 'Chi nhánh TP.HCM',
    saleStartDate: '2026-04-09',
    saleEndDate: '2027-04-08',
    salePaymentStage1: '100.000.000',
    saleItems: common.items,
  });
  const actual = saleContractTemplate.buildHtml(common, {});
  expect(actual).toBe(expected);
});
