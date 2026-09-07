import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { leaseMbTemplate, leaseMbToLegacyParams } from '../templates/leaseMb';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-23';
  c.partyA = { name: 'ĐỖ THỊ HIẾU', cccd: '0791 7802 5859', cccdDate: '29/11/2021', cccdPlace: 'CCS', address: 'Q10', birthYear: '' };
  c.partyB = { name: 'NGÔ NHỊ ĐẠT', cccd: '0343 0300 4676', cccdDate: '03/03/2022', cccdPlace: 'CCS', address: 'Dĩ An', birthYear: '' };
  c.startDate = '2026-04-23';
  c.endDate = '2027-04-22';
  return c;
}
const sampleSpecific = { location: '478/34 Hòa Hảo, Q10', monthlyPrice: '55.000.000', depositAmount: '72.000.000' };

it('maps common+specific into mb_* fields', () => {
  const d = leaseMbToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.mbPartyAName).toBe('ĐỖ THỊ HIẾU');
  expect(d.mbPartyBName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.mbLocation).toBe('478/34 Hòa Hảo, Q10');
  expect(d.mbMonthlyPrice).toBe('55.000.000');
  expect(d.mbStartDate).toBe('2026-04-23');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('lease_mb', {
    ...baseDraft(),
    mbContractDate: '2026-04-23', mbLocation: '478/34 Hòa Hảo, Q10',
    mbPartyAName: 'ĐỖ THỊ HIẾU', mbPartyACccd: '0791 7802 5859', mbPartyACccdDate: '29/11/2021', mbPartyAAddress: 'Q10',
    mbPartyBName: 'NGÔ NHỊ ĐẠT', mbPartyBCccd: '0343 0300 4676', mbPartyBCccdDate: '03/03/2022', mbPartyBAddress: 'Dĩ An',
    mbStartDate: '2026-04-23', mbEndDate: '2027-04-22',
    mbMonthlyPrice: '55.000.000', mbDepositAmount: '72.000.000',
  });
  expect(leaseMbTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
