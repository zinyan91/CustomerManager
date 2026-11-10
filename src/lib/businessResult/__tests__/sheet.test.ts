import { describe, it, expect } from 'vitest';
import type { KqkdSheet } from '../../../types/businessResult';
import { defaultKqkdSheet } from '../seed';
import {
  addDiffColumn, addRow, addValueColumn, assertKqkdSheet, cellValue, formatKqkdNumber,
  moveColumn, parseKqkdInput, removeColumn, rowNumbers, setCell,
} from '../sheet';

function valueAt(sheet: KqkdSheet, rowId: string, colId: string): number | null {
  const row = sheet.rows.find(r => r.id === rowId)!;
  const col = sheet.columns.find(c => c.id === colId)!;
  return cellValue(sheet, row, col);
}

const plainFormat = (n: number, digits: number) => n.toFixed(digits);
const plainParse = (s: string) => Number(s.replace(/,/g, ''));

describe('bảng KQKD mẫu khớp số tự tính của báo cáo nhanh', () => {
  const s = defaultKqkdSheet();
  const cases: [string, number, number, number, number, number][] = [
    // dòng       +/- tuần  +/- 31/08  +/- 30/09  +/- 31/12/2025  GAP 2026
    ['duNo',      358,      -4_306,    -3_764,    -106_638,       238_275],
    ['huyDong',   1_843,    2_973,     6_448,     15_508,         297_367],
    ['the',       0,        24,        7,         -36,            55],
    ['soKh',      2,        119,       26,        553,            1_161],
  ];
  for (const [rowId, week, aug, sep, year, gap] of cases) {
    it(`dòng ${rowId}`, () => {
      expect(valueAt(s, rowId, 'diffWeek')).toBe(week);
      expect(valueAt(s, rowId, 'diff0831')).toBe(aug);
      expect(valueAt(s, rowId, 'diff0930')).toBe(sep);
      expect(valueAt(s, rowId, 'diffYear')).toBe(year);
      expect(valueAt(s, rowId, 'gap2026')).toBe(gap);
    });
  }

  it('CASA bình quân: chênh lệch đúng như báo cáo nhanh', () => {
    expect(valueAt(s, 'casa', 'diffWeek')).toBe(-266);
    expect(valueAt(s, 'casa', 'diff0831')).toBe(-1_799);
    expect(valueAt(s, 'casa', 'diff0930')).toBe(-2_790);
    expect(valueAt(s, 'casa', 'diffYear')).toBe(-4_923);
  });

  it('GAP dòng cộng dồn (TOI) so với tổng các mốc: 18.923 − (903 + 1.008) = 17.012', () => {
    expect(valueAt(s, 'toi', 'gap2026')).toBe(17_012);
  });

  it('GAP LNTT lũy kế tính được (bảng gốc đang lỗi #REF!): 9.228 − 4.804', () => {
    expect(valueAt(s, 'lnttLk', 'gap2026')).toBe(4_424);
  });

  it('chênh lệch để trống khi một trong hai mốc chưa có số', () => {
    expect(valueAt(s, 'thuPhi', 'diffWeek')).toBeNull();
    expect(valueAt(s, 'thuNhapLai', 'diffYear')).toBeNull();
  });

  it('STT chỉ đánh cho dòng chính', () => {
    const nums = rowNumbers(s);
    expect(nums.get('duNo')).toBe(1);
    expect(nums.get('thuPhiSoDep')).toBeNull();
    expect(nums.get('thuNhapLai')).toBe(8);
    expect(nums.get('loiNhuan')).toBe(13);
  });
});

describe('sửa bảng', () => {
  it('thêm cột số liệu chèn sau mốc cuối, trước các cột tự tính', () => {
    const s = addValueColumn(defaultKqkdSheet(), '26/10/2026', 'cNew');
    const ids = s.columns.map(c => c.id);
    expect(ids.indexOf('cNew')).toBe(ids.indexOf('c20261019') + 1);
    expect(ids.indexOf('cNew')).toBe(ids.indexOf('diffWeek') - 1);
  });

  it('cột số liệu mới được tính vào GAP của dòng cộng dồn và thành mốc gần nhất của dòng số dư', () => {
    let s = addValueColumn(defaultKqkdSheet(), '26/10/2026', 'cNew');
    s = setCell(s, 'toi', 'cNew', 89);
    s = setCell(s, 'duNo', 'cNew', 360_000);
    expect(valueAt(s, 'toi', 'gap2026')).toBe(17_012 - 89);
    expect(valueAt(s, 'duNo', 'gap2026')).toBe(591_591 - 360_000);
  });

  it('thêm cột chênh lệch sau cột chênh lệch cuối', () => {
    const s = addDiffColumn(defaultKqkdSheet(), '+/- 30/06', 'c20261019', 'c20260630', 'dNew');
    const ids = s.columns.map(c => c.id);
    expect(ids.indexOf('dNew')).toBe(ids.indexOf('diffYear') + 1);
    expect(valueAt(s, 'duNo', 'dNew')).toBe(353_316 - 409_671);
  });

  it('không cho xóa cột đang được cột tự tính dùng', () => {
    expect(() => removeColumn(defaultKqkdSheet(), 'c20261019')).toThrow('+/- tuần');
    const s = removeColumn(defaultKqkdSheet(), 'c20260430');
    expect(s.columns.some(c => c.id === 'c20260430')).toBe(false);
    expect('c20260430' in s.rows[0].values).toBe(false);
  });

  it('không sửa bảng cũ', () => {
    const s = defaultKqkdSheet();
    const before = JSON.stringify(s);
    setCell(s, 'duNo', 'c20251231', 1);
    addRow(s, 'duNo');
    moveColumn(s, 'c20251231', 1);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('thêm dòng ngay sau dòng chọn', () => {
    const s = addRow(defaultKqkdSheet(), 'duNo', 'rNew');
    expect(s.rows[1].id).toBe('rNew');
  });
});

describe('nhập và hiển thị số', () => {
  it('đọc ô trống, số âm trong ngoặc và chữ không phải số', () => {
    expect(parseKqkdInput('', plainParse)).toBeNull();
    expect(parseKqkdInput(' - ', plainParse)).toBeNull();
    expect(parseKqkdInput('(212)', plainParse)).toBe(-212);
    expect(parseKqkdInput('-649', plainParse)).toBe(-649);
    expect(parseKqkdInput('459,954', plainParse)).toBe(459_954);
    expect(parseKqkdInput('abc', plainParse)).toBeUndefined();
  });

  it('hiển thị kiểu kế toán', () => {
    expect(formatKqkdNumber(null, plainFormat)).toBe('-');
    expect(formatKqkdNumber(-212, plainFormat)).toBe('(212)');
    expect(formatKqkdNumber(6.3, plainFormat)).toBe('6.3');
    expect(formatKqkdNumber(0, plainFormat)).toBe('0');
  });

  it('kiểm tra khuôn dữ liệu đọc từ CSDL', () => {
    expect(assertKqkdSheet(defaultKqkdSheet()).rows.length).toBe(20);
    expect(() => assertKqkdSheet({ title: 'x' })).toThrow('không đúng định dạng');
  });
});
