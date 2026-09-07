import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { paymentRequestConstTemplate, paymentConstToLegacyParams } from '../templates/paymentRequestConst';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.totalAmount = '1.003.700.000';
  c.bank = { owner: 'ĐỖ THỊ LAN ANH', accNo: '0123456789', name: 'Vietcombank', branch: 'CN TP.HCM' };
  c.stages = [{ id: '1', stageName: 'Đợt 1', amount: '53.700.000', status: 'paid', note: '' }];
  return c;
}
const sampleSpecific = { payMethodType: 'transfer' as const, recipientTitle: 'Bà' as const,
  cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '' };

it('maps to const_* buyer/seller, shared stages, bank', () => {
  const d = paymentConstToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constTotalPrice).toBe('1.003.700.000');
  expect(d.payStages).toHaveLength(1);
  expect(d.payBankOwner).toBe('ĐỖ THỊ LAN ANH');
  expect(d.recipientTitle).toBe('Bà');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('payment_request_const', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyBName: 'ĐỖ THỊ LAN ANH',
    constPartyBCccd: '0343 0300 4676',
    constTotalPrice: '1.003.700.000',
    payStages: common.stages,
    payMethodType: 'transfer',
    recipientTitle: 'Bà',
    payBankOwner: 'ĐỖ THỊ LAN ANH',
    payBankAccNo: '0123456789',
    payBankName: 'Vietcombank',
    payBankBranch: 'CN TP.HCM',
  });
  expect(paymentRequestConstTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
