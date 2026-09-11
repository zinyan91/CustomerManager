import { it, expect } from 'vitest';
import { buildLoanContractHtml } from '../../../../lib/documentHtml';
import { emptyCommon } from '../types';
import { loanContractTemplate, type LoanContractSpecific } from '../templates/loanContract';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2024-05-20';
  c.startDate = '2024-05-20';
  c.endDate = '2024-11-20';
  c.partyA = {
    name: 'Trần Cho Vay',
    cccd: '001085000001',
    cccdDate: '01/01/2021',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: 'Hà Nội',
    birthYear: '1975',
  };
  c.partyB = {
    name: 'Hoàng Đi Vay',
    cccd: '001090000002',
    cccdDate: '02/02/2022',
    cccdPlace: 'Cục CSQLHC về TTXH',
    address: 'Hải Phòng',
    birthYear: '1992',
  };
  return c;
}

const sampleSpecific: LoanContractSpecific = {
  loanAmount: '100.000.000',
  loanPurpose: 'Kinh doanh cá thể',
  paymentMethod: 'Chuyển khoản ngân hàng',
  location: 'Hà Nội',
};

it('loanContractTemplate has correct metadata and defaults', () => {
  expect(loanContractTemplate.id).toBe('loan_contract');
  expect(loanContractTemplate.label).toBe('Giấy Vay Tiền');
  expect(loanContractTemplate.specificDefaults.loanPurpose).toBe('Tiêu dùng cá nhân');
});

it('buildHtml generates correct loan contract structure', () => {
  const common = sampleCommon();
  const html = loanContractTemplate.buildHtml(common, sampleSpecific);

  expect(html).toContain('GIẤY VAY TIỀN');
  expect(html).toContain('BÊN CHO VAY (BÊN A)');
  expect(html).toContain('Trần Cho Vay');
  expect(html).toContain('001085000001');
  expect(html).toContain('BÊN VAY (BÊN B)');
  expect(html).toContain('Hoàng Đi Vay');
  expect(html).toContain('001090000002');
  expect(html).toContain('100.000.000 VNĐ');
  expect(html).toContain('Một trăm triệu đồng');
  expect(html).toContain('Kinh doanh cá thể');
  expect(html).toContain('Chuyển khoản ngân hàng');
  expect(html).toContain('Hà Nội');
  expect(html).toContain('ĐIỀU 1: SỐ TIỀN VAY VÀ MỤC ĐÍCH');
  expect(html).toContain('ĐIỀU 2: THỜI HẠN VAY');
  expect(html).toContain('ĐIỀU 3: PHƯƠNG THỨC TRẢ NỢ');
  expect(html).toContain('ĐIỀU 4: CAM KẾT');
  expect(html).toContain('ĐIỀU 5: HIỆU LỰC');
  expect(html).toContain('BÊN CHO VAY');
  expect(html).toContain('BÊN VAY');
});

it('buildLoanContractHtml renders placeholders when data is empty', () => {
  const html = buildLoanContractHtml({
    partyA: { name: '' },
    partyB: { name: '' },
  });

  expect(html).toContain('GIẤY VAY TIỀN');
  expect(html).toContain('BÊN CHO VAY (BÊN A):');
  expect(html).toContain('BÊN VAY (BÊN B):');
  expect(html).toContain('BÊN CHO VAY');
  expect(html).toContain('BÊN VAY');
});
