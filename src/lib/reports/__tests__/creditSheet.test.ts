import { describe, it, expect } from 'vitest';
import { buildCreditSheet, type CreditSheetRow } from '../builders/creditSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<CreditSheetRow> = {}): CreditSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    hdtdNumber: 'HDTD-01', approvalCode: 'PD-2026-01',
    loanMethod: 'Hạn mức', startDate: '2026-01-01', endDate: '2026-10-01',
    granted: 1_000_000_000, used: 400_000_000, available: 600_000_000,
    ...over,
  };
}

describe('buildCreditSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildCreditSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số HĐTD', 'Mã phê duyệt', 'Phương thức vay',
      'Ngày hiệu lực', 'Ngày hết hiệu lực', 'Số ngày', 'Trạng thái',
      'Mức cấp', 'Đã sử dụng', 'Còn khả dụng',
    ]);
  });

  it('loc theo ngay het hieu luc hop dong', () => {
    const data = [
      row({ hdtdNumber: 'SAP', endDate: '2026-10-15' }),
      row({ hdtdNumber: 'XA', endDate: '2027-01-01' }),
    ];
    const sheet = buildCreditSheet(data, 'upcoming', CTX);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[1][3].value).toBe('SAP');
  });

  it('con kha dung bang 0 van hien 0', () => {
    const sheet = buildCreditSheet([row({ available: 0 })], 'all', CTX);
    expect(sheet.rows[1][12].value).toBe(0);
  });

  it('ngay het hieu luc chua khai van ra dong', () => {
    const sheet = buildCreditSheet([row({ endDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[1][7].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildCreditSheet([], 'all', CTX).rows).toHaveLength(2);
  });
});
