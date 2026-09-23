import { describe, it, expect } from 'vitest';
import { buildCollateralSheet, type CollateralSheetRow } from '../builders/collateralSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<CollateralSheetRow> = {}): CollateralSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    assetCode: 'TS-01', assetType: 'BĐS Loại 1', address: '12 Lê Lợi',
    appraisalDate: '2025-10-01', tenorMonths: 12, expiryDate: '2026-10-01',
    appraisedValue: 2_000_000_000, ltvPercent: 80, maxLoan: 1_600_000_000,
    ...over,
  };
}

describe('buildCollateralSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildCollateralSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Mã tài sản', 'Loại tài sản', 'Địa chỉ',
      'Ngày định giá', 'Hiệu lực (tháng)', 'Ngày hết hiệu lực', 'Số ngày',
      'Trạng thái', 'Giá trị định giá', 'LTV (%)', 'Hạn mức tối đa',
    ]);
  });

  it('loc theo ngay het hieu luc chung thu dinh gia', () => {
    const data = [
      row({ assetCode: 'HET', expiryDate: '2026-09-01' }),
      row({ assetCode: 'CON', expiryDate: '2027-05-01' }),
    ];
    const sheet = buildCollateralSheet(data, 'overdue', CTX);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[1][3].value).toBe('HET');
  });

  it('tai san han che nhan co LTV 0 phai hien so 0, khong phai o rong', () => {
    const sheet = buildCollateralSheet([row({ ltvPercent: 0, maxLoan: 0 })], 'all', CTX);
    expect(sheet.rows[1][12].value).toBe(0);
    expect(sheet.rows[1][13].value).toBe(0);
  });

  it('chung thu chua khai ngay het hieu luc van ra dong', () => {
    const sheet = buildCollateralSheet([row({ expiryDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[1][8].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildCollateralSheet([], 'all', CTX).rows).toHaveLength(2);
  });
});
