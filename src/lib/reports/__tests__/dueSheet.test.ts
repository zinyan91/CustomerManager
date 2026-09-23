import { describe, it, expect } from 'vitest';
import { buildDueSheet, liveDebtGroup, type DueSheetRow } from '../builders/dueSheet';

const CTX = { todayIso: '2026-09-23' };

function row(over: Partial<DueSheetRow> = {}): DueSheetRow {
  return {
    cif: '0001', customerName: 'NGUYEN VAN A', kunnNumber: 'KUNN-01',
    periodNumber: 3, dueDate: '2026-09-25',
    principal: 1_000_000, interest: 50_000, total: 1_050_000,
    outstanding: 9_000_000, storedDebtGroup: 1, overdueSchedules: [],
    ...over,
  };
}

describe('buildDueSheet', () => {
  it('dung du bo cot theo dung thu tu', () => {
    const sheet = buildDueSheet([row()], 'all', CTX);
    expect(sheet.rows[0].map(c => c.value)).toEqual([
      'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Kỳ số', 'Ngày đến hạn',
      'Số ngày', 'Trạng thái', 'Gốc kỳ', 'Lãi kỳ', 'Tổng kỳ',
      'Dư nợ hiện hữu', 'Nhóm nợ',
    ]);
  });

  it('loc dung theo moc ky han', () => {
    const data = [
      row({ kunnNumber: 'QH', dueDate: '2026-09-20' }),
      row({ kunnNumber: 'TH', dueDate: '2026-09-25' }),
      row({ kunnNumber: 'SAP', dueDate: '2026-10-10' }),
    ];
    const chiQuaHan = buildDueSheet(data, 'overdue', CTX);
    expect(chiQuaHan.rows).toHaveLength(3);
    expect(chiQuaHan.rows[1][3].value).toBe('QH');
  });

  it('so ngay mang dau am khi qua han', () => {
    const sheet = buildDueSheet([row({ dueDate: '2026-09-20' })], 'all', CTX);
    expect(sheet.rows[1][6].value).toBe(-3);
  });

  it('ngay den han chua khai van ra dong, o ngay de trong', () => {
    const sheet = buildDueSheet([row({ dueDate: null })], 'all', CTX);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[1][5].value).toBe('');
    expect(sheet.rows[1][7].value).toBe('');
  });

  it('danh sach rong van ra sheet co hang tieu de', () => {
    const sheet = buildDueSheet([], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.name).toBeTruthy();
  });
});

describe('liveDebtGroup — nhom no tinh song', () => {
  it('lay nhom cao hon giua nhom luu va nhom tu tinh', () => {
    const quaHan100Ngay = [
      { Id: 1, ContractId: 1, PeriodNumber: 1, DueDate: '2026-06-15', TotalAmount: 1000, IsPaid: false },
    ] as any[];
    expect(liveDebtGroup(1, quaHan100Ngay, '2026-09-23')).toBe(3);
  });

  it('giu nhom luu khi nhom luu cao hon nhom tu tinh', () => {
    expect(liveDebtGroup(4, [], '2026-09-23')).toBe(4);
  });

  it('khong co lich qua han va khong co nhom luu thi la nhom 1', () => {
    expect(liveDebtGroup(undefined, [], '2026-09-23')).toBe(1);
  });
});

describe('Final review — dong TONG CONG va nhan trang thai', () => {
  it('I3: dong cuoi la TONG CONG, chi cong Goc/Lai/Tong ky, khong cong du no lap lai', () => {
    const sheet = buildDueSheet([row(), row({ principal: 2_000_000, interest: 100_000, total: 2_100_000 })], 'all', CTX);
    const cuoi = sheet.rows[sheet.rows.length - 1];
    expect(cuoi[0].value).toBe('TỔNG CỘNG');
    expect(cuoi[8].value).toBe(3_000_000);
    expect(cuoi[9].value).toBe(150_000);
    expect(cuoi[10].value).toBe(3_150_000);
    expect(cuoi[11].value).toBe('');
  });

  it('F6: ngay den han khong xac dinh thi o trang thai de trong, khong khang dinh "Chua toi han"', () => {
    const sheet = buildDueSheet([row({ dueDate: null })], 'all', CTX);
    expect(sheet.rows[1][7].value).toBe('');
  });
});
