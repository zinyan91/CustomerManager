import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { constructionTemplate, constToLegacyParams } from '../templates/construction';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'CCS', address: '233/3/1 Đường Vĩnh Viễn, Q10', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '03/03/2022',
    cccdPlace: 'CCS', address: 'Bình Dương', birthYear: '' };
  c.startDate = '2026-03-20';
  c.endDate = '2026-05-20';
  c.totalAmount = '1.003.700.000';
  c.items = [{ id: '1', name: 'Sửa tường', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Bả vữa' }];
  return c;
}
const sampleSpecific = { siteAddress: '478/34 Hòa Hảo, Q10', depositStage1: '53.700.000',
  stage2Amount: '950.000.000', warrantyMonths: '06' };

it('constToLegacyParams maps common+specific into const_* legacy fields', () => {
  const d = constToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constContractDate).toBe('2026-03-18');
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constSiteAddress).toBe('478/34 Hòa Hảo, Q10');
  expect(d.constTotalPrice).toBe('1.003.700.000');
  expect(d.constItems).toHaveLength(1);
  expect(d.constDurationMonths).toBe(monthsBetweenLabel('2026-03-20', '2026-05-20'));
});

it('buildHtml equals legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('construction', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyACccd: '0791 7802 5859',
    constPartyAAddress: '233/3/1 Đường Vĩnh Viễn, Q10',
    constPartyBName: 'ĐỖ THỊ LAN ANH',
    constPartyBCccd: '0343 0300 4676',
    constSiteAddress: '478/34 Hòa Hảo, Q10',
    constStartDate: '2026-03-20',
    constEndDate: '2026-05-20',
    constTotalPrice: '1.003.700.000',
    constDepositStage1: '53.700.000',
    constStage2Amount: '950.000.000',
    constWarrantyMonths: '06',
    constItems: common.items as any,
    constDurationMonths: monthsBetweenLabel('2026-03-20', '2026-05-20'),
  });
  expect(constructionTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
