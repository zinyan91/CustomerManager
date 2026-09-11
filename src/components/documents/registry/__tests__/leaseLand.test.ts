import { it, expect } from 'vitest';
import { buildLeaseLandHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { leaseLandTemplate, type LeaseLandSpecific } from '../templates/leaseLand';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2024-06-01';
  c.startDate = '2024-06-01';
  c.endDate = '2029-06-01';
  c.partyA = {
    name: 'Đoàn Văn Đất',
    cccd: '079175000111',
    cccdDate: '15/05/2021',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: 'Củ Chi, TP. HCM',
    birthYear: '1968',
  };
  c.partyB = {
    name: 'Phạm Thị Trồng Trọt',
    cccd: '079180000222',
    cccdDate: '20/06/2021',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: 'Hóc Môn, TP. HCM',
    birthYear: '1985',
  };
  return c;
}

const sampleSpecific: LeaseLandSpecific = {
  contractNo: '01/HĐTĐ-2024',
  location: 'Củ Chi, TP. HCM',
  landArea: '1000',
  landAddress: 'Thửa đất số 45, Tờ bản đồ số 8, Xã Phú Hòa Đông, Củ Chi',
  termYears: '5',
  purpose: 'Trồng cây ăn trái',
  rentPricePerYear: '50.000.000',
  paymentMethod: 'Chuyển khoản hàng năm',
};

it('leaseLandTemplate has correct metadata and defaults', () => {
  expect(leaseLandTemplate.id).toBe('lease_land');
  expect(leaseLandTemplate.label).toBe('HĐ Thuê Đất');
  expect(leaseLandTemplate.specificDefaults.termYears).toBe('5');
});

it('buildHtml generates correct land lease structure', () => {
  const common = sampleCommon();
  const html = leaseLandTemplate.buildHtml(common, sampleSpecific);

  expect(html).toContain('HỢP ĐỒNG THUÊ ĐẤT');
  expect(html).toContain('01/HĐTĐ-2024');
  expect(html).toContain('BÊN CHO THUÊ ĐẤT (BÊN A)');
  expect(html).toContain('Đoàn Văn Đất');
  expect(html).toContain('079175000111');
  expect(html).toContain('BÊN THUÊ ĐẤT (BÊN B)');
  expect(html).toContain('Phạm Thị Trồng Trọt');
  expect(html).toContain('079180000222');
  expect(html).toContain('1000 m²');
  expect(html).toContain('Thửa đất số 45, Tờ bản đồ số 8, Xã Phú Hòa Đông, Củ Chi');
  expect(html).toContain('5 năm');
  expect(html).toContain('Trồng cây ăn trái');
  expect(html).toContain('50.000.000 đồng/năm');
  expect(html).toContain('Chuyển khoản hàng năm');
  expect(html).toContain('Điều 1. Bên cho thuê đất cho Bên thuê đất thuê khu đất như sau:');
  expect(html).toContain('Điều 2. Bên thuê đất có trách nhiệm trả tiền thuê đất theo quy định sau:');
  expect(html).toContain('Điều 3. Việc sử dụng đất trên khu đất thuê');
  expect(html).toContain('Điều 4. Quyền và nghĩa vụ của các bên');
  expect(html).toContain('Điều 5. Hợp đồng thuê đất chấm dứt trong các trường hợp sau:');
  expect(html).toContain('BÊN CHO THUÊ ĐẤT');
  expect(html).toContain('BÊN THUÊ ĐẤT');
});

it('buildLeaseLandHtml renders placeholders when data is empty', () => {
  const html = buildLeaseLandHtml({
    partyA: { name: '' },
    partyB: { name: '' },
  });

  expect(html).toContain('HỢP ĐỒNG THUÊ ĐẤT');
  expect(html).toContain('BÊN CHO THUÊ ĐẤT (BÊN A):');
  expect(html).toContain('BÊN THUÊ ĐẤT (BÊN B):');
  expect(html).toContain('BÊN CHO THUÊ ĐẤT');
  expect(html).toContain('BÊN THUÊ ĐẤT');
});
