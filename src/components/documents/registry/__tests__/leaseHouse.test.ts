import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { leaseHouseTemplate, leaseHouseToLegacyParams } from '../templates/leaseHouse';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-23';
  c.partyA = { name: 'ĐỖ THỊ HIẾU', cccd: '079', cccdDate: '29/11/2021', cccdPlace: '', address: 'Q10', birthYear: '' };
  c.partyB = { name: 'NGÔ NHỊ ĐẠT', cccd: '034', cccdDate: '03/03/2022', cccdPlace: '', address: 'Dĩ An', birthYear: '' };
  c.startDate = '2026-04-23'; c.endDate = '2027-04-22';
  return c;
}
const sampleSpecific = { location: 'Số 1 đường A', floors: '01', landArea: '80', houseArea: '75', handoverDate: '2026-04-23', paymentDay: '05', monthlyPrice: '55.000.000', depositAmount: '72.000.000' };

it('maps + derives lhTermLabel', () => {
  const d = leaseHouseToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.lhFloors).toBe('01');
  expect(d.mbPartyAName).toBe('ĐỖ THỊ HIẾU');
  expect(d.mbMonthlyPrice).toBe('55.000.000');
  expect(d.lhTermLabel).toBe(monthsBetweenLabel('2026-04-23', '2027-04-22'));
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('lease_house', {
    ...baseDraft(),
    mbContractDate: '2026-04-23', mbLocation: 'Số 1 đường A',
    mbPartyAName: 'ĐỖ THỊ HIẾU', mbPartyACccd: '079', mbPartyACccdDate: '29/11/2021', mbPartyAAddress: 'Q10',
    mbPartyBName: 'NGÔ NHỊ ĐẠT', mbPartyBCccd: '034', mbPartyBCccdDate: '03/03/2022', mbPartyBAddress: 'Dĩ An',
    lhFloors: '01', lhLandArea: '80', lhHouseArea: '75', lhHandoverDate: '2026-04-23', lhPaymentDay: '05',
    mbMonthlyPrice: '55.000.000', mbDepositAmount: '72.000.000',
    lhTermLabel: monthsBetweenLabel('2026-04-23', '2027-04-22'),
  });
  expect(leaseHouseTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
