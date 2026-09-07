import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { constEstimateTemplate, estimateToLegacyParams } from '../templates/constEstimate';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.totalAmount = '1.003.700.000';
  c.items = [{ id: '1', name: 'Sửa tường', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Bả vữa' }];
  return c;
}
const sampleSpecific = { siteAddress: '478/34 Hòa Hảo, Q10' };

it('maps common+specific into const_* estimate fields', () => {
  const d = estimateToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constSiteAddress).toBe('478/34 Hòa Hảo, Q10');
  expect(d.constItems).toHaveLength(1);
  expect(d.constTotalPrice).toBe('1.003.700.000');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('const_estimate', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyBName: 'ĐỖ THỊ LAN ANH', constPartyBCccd: '0343 0300 4676',
    constSiteAddress: '478/34 Hòa Hảo, Q10',
    constTotalPrice: '1.003.700.000',
    constItems: common.items as any,
  });
  expect(constEstimateTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
