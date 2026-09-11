import { it, expect } from 'vitest';
import { emptyCommon } from '../types';
import { depositTemplate, depositToLegacyParams, DEFAULT_DEPOSIT_SPECIFIC } from '../templates/deposit';
import { DOSSIERS } from '../dossiers';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-08-04';
  c.partyA = { name: 'LÊ VĂN KHÁNH', cccd: '0792 0302 9484', cccdDate: '11/04/2024', cccdPlace: 'Cục Cảnh Sát', address: '316 Phú Thọ Hòa, Tân Phú, Tp.HCM', birthYear: '2003' };
  c.partyB = { name: 'PHAN THANH HẬU', cccd: '0870 7400 7100', cccdDate: '11/08/2022', cccdPlace: 'Cục Cảnh Sát', address: '40, KP 2, P3, TP Tây Ninh', birthYear: '1974' };
  return c;
}

it('folder Khác tồn tại và chứa mẫu HĐ Đặt Cọc (QSDĐ)', () => {
  const khac = DOSSIERS.find(d => d.id === 'khac');
  expect(khac).toBeDefined();
  expect(khac?.label).toBe('Khác');
  expect(khac?.documents.map(x => x.templateId)).toContain('deposit');
});

it('depositToLegacyParams maps partyA to buyer and partyB to seller', () => {
  const d = depositToLegacyParams(sampleCommon(), DEFAULT_DEPOSIT_SPECIFIC);
  expect(d.deposit.buyerName).toBe('LÊ VĂN KHÁNH');
  expect(d.deposit.sellerName).toBe('PHAN THANH HẬU');
  expect(d.deposit.parcelNo).toBe(DEFAULT_DEPOSIT_SPECIFIC.parcelNo);
  expect(d.deposit.transferPrice).toBe(DEFAULT_DEPOSIT_SPECIFIC.transferPrice);
});

it('buildHtml sinh HTML hợp lệ chứa nội dung HỢP ĐỒNG ĐẶT CỌC', () => {
  const html = depositTemplate.buildHtml(sampleCommon(), DEFAULT_DEPOSIT_SPECIFIC);
  expect(html).toContain('HỢP ĐỒNG ĐẶT CỌC');
  expect(html).toContain('LÊ VĂN KHÁNH');
  expect(html).toContain('PHAN THANH HẬU');
  expect(html).toContain(DEFAULT_DEPOSIT_SPECIFIC.parcelNo);
});
