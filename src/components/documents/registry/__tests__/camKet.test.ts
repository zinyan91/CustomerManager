import { describe, it, expect } from 'vitest';
import { buildGiayCamKetHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { camKetTemplate } from '../templates/camKet';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH', address: '', birthYear: '' };
  return c;
}

it('buildHtml equals buildGiayCamKetHtml for the same seller data (golden)', () => {
  const common = sampleCommon();
  const expected = buildGiayCamKetHtml({
    hoTen: 'TRẦN THỊ PHƯƠNG',
    cccd: '0791 7802 5859',
    ngayCap: '29/11/2021',
    noiCap: 'Cục Cảnh sát QLHC về TTXH',
    ngayLap: '2026-04-09',
  });
  expect(camKetTemplate.buildHtml(common, {})).toBe(expected);
});
