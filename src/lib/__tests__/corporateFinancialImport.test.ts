import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { createSampleCorporateProfile } from '../corporateFinancialDefaults';
import { parseCorporateFinancialExcel } from '../corporateFinancialImport';

describe('Đọc và nhập file Excel Báo cáo tài chính doanh nghiệp', () => {
  it('đọc chính xác file Excel BCTC gồm B01a và B02', () => {
    // Tạo 1 workbook mẫu bằng XLSX
    const wb = XLSX.utils.book_new();

    // Sheet B01a
    const b01aData = [
      ['CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI MINH ĐỨC', '', '', '', 'Mẫu số B01a - DNNVV'],
      ['Mã số thuế: 0108998877', '', '', '', '(Ban hành theo TT số 133/2016/TT-BTC)'],
      ['Địa chỉ: Số 123 Phố Huế, Q. Hai Bà Trưng, Hà Nội', '', '', '', ''],
      [],
      ['', 'BÁO CÁO TÌNH HÌNH TÀI CHÍNH', '', '', ''],
      ['', 'Năm tài chính: 2024', '', '', ''],
      [],
      ['CHỈ TIÊU', 'MÃ SỐ', 'THUYẾT MINH', 'SỐ CUỐI NĂM (2024)', 'SỐ ĐẦU NĂM (2023)'],
      ['I. Tiền và các khoản tương đương tiền', '110', '', 1250000000, 900000000],
      ['A. TÀI SẢN NGẮN HẠN', '100', '', 1250000000, 900000000],
      ['Phải thu khách hàng', '131', '', 2400000000, 1800000000],
      ['Hàng tồn kho', '141', '', 3600000000, 2900000000],
      ['Vốn góp của chủ sở hữu', '411', '', 5000000000, 5000000000],
    ];
    const wsB01a = XLSX.utils.aoa_to_sheet(b01aData);
    XLSX.utils.book_append_sheet(wb, wsB01a, 'B01a_THTC');

    // Sheet B02
    const b02Data = [
      ['CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI MINH ĐỨC', '', '', '', 'Mẫu số B02 - DNNVV'],
      ['Mã số thuế: 0108998877', '', '', '', ''],
      [],
      ['', 'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH', '', '', ''],
      ['', 'Năm tài chính: 2024', '', '', ''],
      [],
      ['CHỈ TIÊU', 'MÃ SỐ', 'THUYẾT MINH', 'NĂM NAY (2024)', 'NĂM TRƯỚC (2023)'],
      ['1. Doanh thu bán hàng và cung cấp dịch vụ', '01', '', 18500000000, 15200000000],
      ['2. Các khoản giảm trừ doanh thu', '02', '', 250000000, 180000000],
      ['4. Giá vốn hàng bán', '11', '', 13800000000, 11500000000],
    ];
    const wsB02 = XLSX.utils.aoa_to_sheet(b02Data);
    XLSX.utils.book_append_sheet(wb, wsB02, 'B02_KQKD');

    // Xuất ra array buffer
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    // Gọi parser
    const result = parseCorporateFinancialExcel(buf);

    expect(result.sheetCount).toBe(2);
    expect(result.profile.name).toBe('CÔNG TY TNHH PHÁT TRIỂN THƯƠNG MẠI MINH ĐỨC');
    expect(result.profile.taxCode).toBe('0108998877');
    expect(result.profile.year).toBe(2024);

    // Kiểm tra B01a items
    const item110 = result.profile.b01a.items.find(i => i.code === '110');
    expect(item110?.currentPeriod).toBe(1250000000);
    expect(item110?.previousPeriod).toBe(900000000);

    const item131 = result.profile.b01a.items.find(i => i.code === '131');
    expect(item131?.currentPeriod).toBe(2400000000);

    // Kiểm tra B02 items
    const item01 = result.profile.b02.items.find(i => i.code === '01');
    expect(item01?.currentPeriod).toBe(18500000000);
    expect(item01?.previousPeriod).toBe(15200000000);

    // Tự động tính chỉ số doanh thu thuần (Mã 10 = 01 - 02)
    const item10 = result.profile.b02.items.find(i => i.code === '10');
    expect(item10?.currentPeriod).toBe(18250000000);
  });

  it('đọc chính xác file Excel xuất ra từ hệ thống (Round-trip)', () => {
    const sample = createSampleCorporateProfile();
    const wb = XLSX.utils.book_new();

    // Dựng 3 sheet từ sample
    const ws01a = XLSX.utils.aoa_to_sheet([
      [sample.name, '', '', '', 'Mẫu số B01a - DNNVV'],
      [`Mã số thuế: ${sample.taxCode}`, '', '', '', ''],
      [`Địa chỉ: ${sample.address}`, '', '', '', ''],
      [],
      ['', 'BÁO CÁO TÌNH HÌNH TÀI CHÍNH'],
      ['', `Năm tài chính: ${sample.year}`],
      [],
      ['CHỈ TIÊU', 'MÃ SỐ', 'THUYẾT MINH', 'SỐ CUỐI NĂM', 'SỐ ĐẦU NĂM'],
      ...sample.b01a.items.map(it => [it.name, it.code, it.note || '', it.currentPeriod, it.previousPeriod]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws01a, 'B01a_THTC');

    const ws02 = XLSX.utils.aoa_to_sheet([
      [sample.name, '', '', '', 'Mẫu số B02 - DNNVV'],
      [`Mã số thuế: ${sample.taxCode}`, '', '', '', ''],
      [],
      ['', 'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH'],
      ['', `Năm tài chính: ${sample.year}`],
      [],
      ['CHỈ TIÊU', 'MÃ SỐ', 'THUYẾT MINH', 'NĂM NAY', 'NĂM TRƯỚC'],
      ...sample.b02.items.map(it => [it.name, it.code, it.note || '', it.currentPeriod, it.previousPeriod]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws02, 'B02_KQKD');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const res = parseCorporateFinancialExcel(buf);

    expect(res.profile.name).toBe(sample.name);
    expect(res.profile.taxCode).toBe(sample.taxCode);
    expect(res.profile.year).toBe(sample.year);
    expect(res.matchedItemsCount.b01a).toBe(sample.b01a.items.length);
    expect(res.matchedItemsCount.b02).toBe(sample.b02.items.length);
  });
});
