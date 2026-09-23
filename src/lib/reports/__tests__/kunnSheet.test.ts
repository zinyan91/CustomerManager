import { describe, it, expect } from 'vitest';
import { buildKunnSheet, type KunnSheetRow } from '../builders/kunnSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<KunnSheetRow> = {}): KunnSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A',
    kunnNumber: 'KUNN-01', creditContractNumber: 'HDTD-01',
    loanMethod: 'Từng lần', disbursementDate: '2026-01-10',
    kunnDueDate: '2026-09-25', loanAmount: 500_000_000,
    outstanding: 300_000_000, interestRate: 9.5,
    storedDebtGroup: 1, overdueSchedules: [],
    ...over,
  };
}

describe('buildKunnSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildKunnSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Số HĐTD gốc', 'Phương thức vay',
      'Ngày giải ngân', 'Ngày đáo hạn KUNN', 'Số ngày', 'Trạng thái',
      'Số tiền nhận nợ', 'Dư nợ hiện hữu', 'Lãi suất', 'Nhóm nợ',
    ]);
  });

  it('loc theo KunnDueDate chu khong phai ngay giai ngan', () => {
    const data = [
      row({ kunnNumber: 'A', kunnDueDate: '2026-09-20', disbursementDate: '2026-10-20' }),
      row({ kunnNumber: 'B', kunnDueDate: '2026-12-31', disbursementDate: '2026-09-20' }),
    ];
    const sheet = buildKunnSheet(data, 'overdue', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][3].value).toBe('A');
  });

  it('du no bang 0 van hien so 0, khong bi bien thanh o rong', () => {
    const sheet = buildKunnSheet([row({ outstanding: 0 })], 'all', CTX);
    expect(sheet.rows[1][11].value).toBe(0);
  });

  it('du no chua khai (null) thi de o trong, khong phai so 0', () => {
    const sheet = buildKunnSheet([row({ outstanding: null })], 'all', CTX);
    expect(sheet.rows[1][11].value).toBe('');
  });

  it('ngay dao han chua khai van ra dong', () => {
    const sheet = buildKunnSheet([row({ kunnDueDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[1][7].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    expect(buildKunnSheet([], 'all', CTX).rows).toHaveLength(1);
  });
});
