import { describe, it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { paymentRequestSaleTemplate, paymentToLegacyParams } from '../templates/paymentRequestSale';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.bank = { owner: 'ĐỖ THỊ LAN ANH', accNo: '0123456789', name: 'Vietcombank', branch: 'Chi nhánh TP.HCM' };
  c.items = [{ id: '1', name: 'Lúa', unit: 'Tấn', quantity: 25, price: 8500000 }];
  c.stages = [
    { id: '1', stageName: 'Đợt 1', amount: '53.700.000', status: 'paid', note: '' },
    { id: '2', stageName: 'Đợt 2', amount: '950.000.000', status: 'current', note: '' },
  ];
  return c;
}

const sampleSpecific = {
  payMethodType: 'transfer' as const,
  recipientTitle: 'Ông' as const,
  cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
};

it('paymentToLegacyParams maps shared stages/items and parties', () => {
  const d = paymentToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.saleBuyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.saleSellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(d.payStages).toHaveLength(2);
  expect(d.saleItems).toHaveLength(1);
  expect(d.payBankOwner).toBe('ĐỖ THỊ LAN ANH');
  expect(d.payMethodType).toBe('transfer');
  expect(d.recipientTitle).toBe('Ông');
});

it('buildHtml equals legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('payment_request_sale', {
    ...baseDraft(),
    saleContractDate: '2026-04-09',
    saleBuyerName: 'NGÔ NHỊ ĐẠT',
    saleSellerName: 'TRẦN THỊ PHƯƠNG',
    saleItems: common.items,
    payStages: common.stages,
    payMethodType: 'transfer',
    recipientTitle: 'Ông',
    payBankOwner: 'ĐỖ THỊ LAN ANH',
    payBankAccNo: '0123456789',
    payBankName: 'Vietcombank',
    payBankBranch: 'Chi nhánh TP.HCM',
  });
  const actual = paymentRequestSaleTemplate.buildHtml(common, sampleSpecific);
  expect(actual).toBe(expected);
});
