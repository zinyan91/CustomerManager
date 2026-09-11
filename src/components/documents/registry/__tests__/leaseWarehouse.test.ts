import { it, expect } from 'vitest';
import { buildLeaseWarehouseHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { leaseWarehouseTemplate, type LeaseWarehouseSpecific } from '../templates/leaseWarehouse';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2024-05-15';
  c.startDate = '2024-06-01';
  c.endDate = '2025-06-01';
  c.partyA = {
    name: 'Nguyễn Văn Kho',
    cccd: '079171026400',
    cccdDate: '10/08/2021',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: '123 Đường Số 1, TP. HCM',
    birthYear: '1980',
  };
  c.partyB = {
    name: 'Lê Văn Thuê',
    cccd: '036203014544',
    cccdDate: '13/04/2021',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: '456 Đường Số 2, Bình Dương',
    birthYear: '1990',
  };
  return c;
}

const sampleSpecific: LeaseWarehouseSpecific = {
  area: '150',
  warehouseAddress: 'Ấp 2, Xã Tiến Hưng, TP. Đồng Xoài, Bình Phước',
  paymentDay: '25',
  monthlyPrice: '15.000.000',
  signPlace: 'Bình Phước',
};

it('leaseWarehouseTemplate has correct metadata and defaults', () => {
  expect(leaseWarehouseTemplate.id).toBe('lease_warehouse');
  expect(leaseWarehouseTemplate.label).toBe('HĐ Thuê Nhà Kho');
  expect(leaseWarehouseTemplate.specificDefaults.area).toBe('65');
  expect(leaseWarehouseTemplate.specificDefaults.paymentDay).toBe('25');
});

it('buildHtml generates correct warehouse lease structure', () => {
  const common = sampleCommon();
  const html = leaseWarehouseTemplate.buildHtml(common, sampleSpecific);

  expect(html).toContain('HỢP ĐỒNG THUÊ NHÀ KHO');
  expect(html).toContain('Nguyễn Văn Kho');
  expect(html).toContain('079171026400');
  expect(html).toContain('Lê Văn Thuê');
  expect(html).toContain('036203014544');
  expect(html).toContain('150 m²');
  expect(html).toContain('Ấp 2, Xã Tiến Hưng, TP. Đồng Xoài, Bình Phước');
  expect(html).toContain('15.000.000 đ/tháng');
  expect(html).toContain('ngày 25 hàng tháng');
  expect(html).toContain('ĐIỀU 1:');
  expect(html).toContain('ĐIỀU 2:');
  expect(html).toContain('ĐIỀU 3: TRÁCH NHIỆM BÊN A');
  expect(html).toContain('ĐIỀU 4: TRÁCH NHIỆM BÊN B');
  expect(html).toContain('ĐIỀU 5: ĐIỀU KHOẢN CHUNG');
  expect(html).toContain('ĐẠI DIỆN BÊN A');
  expect(html).toContain('ĐẠI DIỆN BÊN B');
  expect(html).toContain('Bình Phước');
});

it('buildLeaseWarehouseHtml renders placeholders when data is empty', () => {
  const html = buildLeaseWarehouseHtml({
    partyA: { name: '' },
    partyB: { name: '' },
  });

  expect(html).toContain('HỢP ĐỒNG THUÊ NHÀ KHO');
  expect(html).toContain('(BÊN A) BÊN CHO THUÊ NHÀ KHO');
  expect(html).toContain('(BÊN B) BÊN THUÊ NHÀ');
  expect(html).toContain('ĐẠI DIỆN BÊN A');
  expect(html).toContain('ĐẠI DIỆN BÊN B');
});
