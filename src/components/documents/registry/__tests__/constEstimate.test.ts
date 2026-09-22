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

it('buildHtml renders 7-column layout and summary rows matching BẢNG DỰ TOÁN CHI TIẾT', () => {
  const common = sampleCommon();
  const html = constEstimateTemplate.buildHtml(common, {
    sheetTitle: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
    loanAmount: 150000000,
    unitPrice: 6000000,
    creatorTitle: 'Người lập',
    creatorName: 'LÝ THỊ THÙY DUNG',
  });

  // Check 7 columns in table header
  expect(html).toContain('STT');
  expect(html).toContain('Tên Hạng Mục');
  expect(html).toContain('Đơn Vị Tính');
  expect(html).toContain('Số Lượng');
  expect(html).toContain('Đơn Giá');
  expect(html).toContain('Thành Tiền');
  expect(html).toContain('Ghi Chú');

  // Check summary rows
  expect(html).toContain('Tổng cộng');
  expect(html).toContain('Vốn vay');
  expect(html).toContain('Vốn tự có');
  expect(html).toContain('Đơn giá');

  // Check title and creator
  expect(html).toContain('BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT');
  expect(html).toContain('LÝ THỊ THÙY DUNG');
});

it('buildXlsx produces a valid Excel (.xlsx) file buffer with PK zip magic header', () => {
  const common = sampleCommon();
  const xlsxBytes = constEstimateTemplate.buildXlsx!(common, {
    sheetTitle: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
    loanAmount: 150000000,
    unitPrice: 6000000,
  });

  expect(xlsxBytes).toBeInstanceOf(Uint8Array);
  expect(xlsxBytes.length).toBeGreaterThan(500);
  // Zip/XLSX magic bytes: PK\x03\x04
  expect(xlsxBytes[0]).toBe(0x50);
  expect(xlsxBytes[1]).toBe(0x4b);
  expect(xlsxBytes[2]).toBe(0x03);
  expect(xlsxBytes[3]).toBe(0x04);
});

it('has standalone flag set to true for independent preview and no common fields', () => {
  expect(constEstimateTemplate.standalone).toBe(true);
});

it('supports switching between landscape (default) and portrait orientation', () => {
  const common = sampleCommon();
  const htmlLandscape = constEstimateTemplate.buildHtml(common, { orientation: 'landscape' });
  expect(htmlLandscape).toContain('size: A4 landscape');

  const htmlPortrait = constEstimateTemplate.buildHtml(common, { orientation: 'portrait' });
  expect(htmlPortrait).toContain('size: A4 portrait');
});

