import { describe, it, expect } from 'vitest';
import { buildBm12Xlsx, dateToExcelSerial } from '../bm12Export';
import * as XLSX from 'xlsx';

describe('bm12Export', () => {
  it('dateToExcelSerial calculates correctly for 2025-12-05 and 2026-02-03', () => {
    expect(dateToExcelSerial('2025-12-05')).toBe(45996);
    expect(dateToExcelSerial('2026-02-03')).toBe(46056);
    expect(dateToExcelSerial('2026-02-03') - dateToExcelSerial('2025-12-05')).toBe(60);
  });

  it('buildBm12Xlsx creates a valid Excel file matching BM12 requirements', () => {
    const bytes = buildBm12Xlsx({
      customerName: 'NGUYEN VAN ANH',
      cif: '005123456',
      tkv: '000000345678',
      loans: [
        {
          stt: 1,
          customerName: 'NGUYEN VAN ANH',
          cif: '005123456',
          tkv: '000000345678',
          fromDate: '2025-12-05',
          toDate: '2026-02-03',
          days: 60,
          balance: 1213851609,
          interestRateAnnual: 0.1525,
          penalty: 0,
        },
      ],
    });

    expect(bytes).toBeDefined();
    expect(bytes.length).toBeGreaterThan(0);

    // Đọc lại bằng XLSX để kiểm tra độ tương thích chuẩn XLSX
    const wb = XLSX.read(bytes, { type: 'array' });
    expect(wb.SheetNames).toContain('Sheet1');

    const ws = wb.Sheets['Sheet1'];
    expect(ws['A1']?.v).toContain('BM12');
    expect(ws['A2']?.v).toBe('BẢNG TÍNH THU NỢ KHOẢN VAY CCSTK');
    expect(ws['L3']?.v).toBe('ĐVT: VND');
    expect(ws['B4']?.v).toBe('TÊN KHÁCH HÀNG');

    // Dòng dữ liệu 5
    expect(ws['B5']?.v).toBe('NGUYEN VAN ANH');
    expect(ws['C5']?.v).toBe('005123456');
    expect(ws['D5']?.v).toBe('000000345678');
    expect(ws['E5']?.v).toBe(45996);
    expect(ws['F5']?.v).toBe(46056);
    expect(ws['G5']?.f).toBe('F5-E5');
    expect(ws['H5']?.v).toBe(1213851609);
    expect(ws['I5']?.v).toBe(0.1525);
    expect(ws['J5']?.f).toBe('H5*I5/365*G5');

    // Dòng tổng
    expect(ws['A6']?.v).toBe('Tổng');
    expect(ws['H6']?.f).toBe('H5');
    expect(ws['J6']?.f).toBe('J5');

    // Dòng tổng gốc + lãi + phạt
    expect(ws['A7']?.v).toBe('Tổng gốc + lãi + phạt');
    expect(ws['H7']?.f).toBe('H6+J6+K6');

    // Merges
    expect(ws['!merges']?.length).toBeGreaterThan(0);
  });
});
