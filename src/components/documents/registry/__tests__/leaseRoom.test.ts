import { it, expect } from 'vitest';
import { buildLeaseRoomHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { leaseRoomTemplate, type LeaseRoomSpecific } from '../templates/leaseRoom';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2024-05-11';
  c.partyA = {
    name: 'Phạm Thị Thanh Hà',
    cccd: '079171026400',
    cccdDate: '10/08/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    address: '55/3 Tân Quý, P. Tân Sơn Nhì, TP. HCM',
    birthYear: '1971',
  };
  c.partyB = {
    name: 'Trần Văn Tuyên',
    cccd: '036203014544',
    cccdDate: '13/04/2021',
    cccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    address: "Thôn 9, Cư Mốt, Ea H'leo, Đắk Lắk",
    birthYear: '2003',
  };
  return c;
}

const sampleSpecific: LeaseRoomSpecific = {
  partyAPhone: '0982486251',
  partyBPhone: '0901234567',
  roomNo: '1',
  houseNo: '55/3 Tân Quý, P. Tân Sơn Nhì, TP. HCM',
  location: '55/3 Tân Quý, P. Tân Sơn Nhì, TP. HCM',
  coTenants: '1. Nguyễn Văn A\n2. Lê Thị B',
  monthlyPrice: '4.000.000',
  purpose: 'Ở',
  termMonths: '12',
};

it('leaseRoomTemplate has correct metadata and defaults', () => {
  expect(leaseRoomTemplate.id).toBe('lease_room');
  expect(leaseRoomTemplate.label).toBe('HĐ Thuê Phòng Trọ');
  expect(leaseRoomTemplate.specificDefaults.purpose).toBe('Ở');
});

it('buildHtml generates correct room rental contract structure', () => {
  const common = sampleCommon();
  const html = leaseRoomTemplate.buildHtml(common, sampleSpecific);

  expect(html).toContain('HỢP ĐỒNG THUÊ PHÒNG TRỌ');
  expect(html).toContain('Phạm Thị Thanh Hà');
  expect(html).toContain('079171026400');
  expect(html).toContain('0982486251');
  expect(html).toContain('Trần Văn Tuyên');
  expect(html).toContain('036203014544');
  expect(html).toContain('0901234567');
  expect(html).toContain('phòng số 1');
  expect(html).toContain('4.000.000 đồng/tháng');
  expect(html).toContain('12 tháng');
  expect(html).toContain('Nguyễn Văn A');
  expect(html).toContain('Lê Thị B');
  expect(html).toContain('ĐIỀU I:');
  expect(html).toContain('ĐIỀU II:');
  expect(html).toContain('ĐIỀU III: TRÁCH NHIỆM CỦA BÊN A');
  expect(html).toContain('ĐIỀU IV: TRÁCH NHIỆM CỦA BÊN B');
  expect(html).toContain('ĐIỀU KHOẢN KHÁC');
  expect(html).toContain('ĐIỀU KHOẢN CHUNG');
  expect(html).toContain('ĐẠI DIỆN BÊN B');
  expect(html).toContain('ĐẠI DIỆN BÊN A');
});

it('buildLeaseRoomHtml renders placeholders when data is empty', () => {
  const html = buildLeaseRoomHtml({
    partyA: { name: '' },
    partyB: { name: '' },
  });

  expect(html).toContain('HỢP ĐỒNG THUÊ PHÒNG TRỌ');
  expect(html).toContain('CHỦ NHÀ (BÊN A)');
  expect(html).toContain('NGƯỜI THUÊ (BÊN B)');
  expect(html).toContain('Những người cùng thuê phòng:');
  expect(html).toContain('ĐẠI DIỆN BÊN B');
  expect(html).toContain('ĐẠI DIỆN BÊN A');
});
