import { describe, it, expect } from 'vitest';
import {
  formatMoneyInput,
  parseMoneyInput,
  fmtRate,
  formatAssetType,
  parseAnyDate,
  fmtDate,
  getContractRateHistory,
  serializeContractRateHistory,
  getEffectiveActiveRate,
  getMasterHdtdNumber,
} from './utils';
import type { LoanContract } from '../types';

describe('formatMoneyInput / parseMoneyInput', () => {
  it('định dạng theo chuẩn Việt Nam (dấu chấm ngăn nghìn)', () => {
    expect(formatMoneyInput('1000000')).toBe('1.000.000');
  });

  it('bỏ qua ký tự không phải số', () => {
    expect(formatMoneyInput('1a2b3')).toBe('123');
    expect(formatMoneyInput('')).toBe('');
    expect(formatMoneyInput('abc')).toBe('');
  });

  it('parse ngược lại đúng giá trị', () => {
    expect(parseMoneyInput('1.000.000')).toBe(1_000_000);
    expect(parseMoneyInput('')).toBe(0);
  });

  it('khứ hồi không mất giá trị', () => {
    expect(parseMoneyInput(formatMoneyInput('987654321'))).toBe(987_654_321);
  });
});

describe('fmtRate', () => {
  it('nhận cả dạng thập phân lẫn phần trăm', () => {
    expect(fmtRate(0.085)).toBe('8.5%/năm');
    expect(fmtRate(8.5)).toBe('8.5%/năm');
  });

  it('trả gạch ngang khi không có giá trị', () => {
    expect(fmtRate(null)).toBe('—');
    expect(fmtRate(undefined)).toBe('—');
    expect(fmtRate(NaN)).toBe('—');
  });
});

describe('formatAssetType', () => {
  it('bỏ tiền tố BĐS', () => {
    expect(formatAssetType('BĐS - Loại 1')).toBe('Loại 1');
    expect(formatAssetType('BDS - Loại 2')).toBe('Loại 2');
    expect(formatAssetType('BĐS Loại 3')).toBe('Loại 3');
  });

  it('giữ nguyên khi không có tiền tố', () => {
    expect(formatAssetType('Loại 1')).toBe('Loại 1');
  });

  it('mặc định Loại 1 khi rỗng', () => {
    expect(formatAssetType(null)).toBe('Loại 1');
    expect(formatAssetType('')).toBe('Loại 1');
  });
});

describe('parseAnyDate', () => {
  it('đọc định dạng ISO', () => {
    expect(parseAnyDate('2026-08-03')).toEqual({ year: 2026, month: 8, day: 3 });
  });

  it('cắt bỏ phần giờ của ISO timestamp', () => {
    expect(parseAnyDate('2026-08-03T10:30:00Z')).toEqual({ year: 2026, month: 8, day: 3 });
  });

  it('đọc DD/MM/YYYY khi ngày > 12 (không thể nhầm)', () => {
    expect(parseAnyDate('25/12/2026')).toEqual({ year: 2026, month: 12, day: 25 });
  });

  it('đọc MM/DD/YYYY khi số thứ hai > 12 (không thể nhầm)', () => {
    expect(parseAnyDate('12/25/2026')).toEqual({ year: 2026, month: 12, day: 25 });
  });

  it('trường hợp NHẬP NHẰNG mặc định hiểu là DD/MM/YYYY (chuẩn Việt Nam)', () => {
    // 05/06/2026 có thể là 5/6 hoặc 6/5. Quy ước: ngày trước, tháng sau.
    expect(parseAnyDate('05/06/2026')).toEqual({ year: 2026, month: 6, day: 5 });
  });

  it('trả null với đầu vào rỗng', () => {
    expect(parseAnyDate(null)).toBeNull();
    expect(parseAnyDate('')).toBeNull();
    expect(parseAnyDate('—')).toBeNull();
  });
});

describe('fmtDate', () => {
  it('mặc định hiển thị dd/mm/yyyy', () => {
    expect(fmtDate('2026-08-03')).toBe('03/08/2026');
  });

  it('hỗ trợ các định dạng khác', () => {
    expect(fmtDate('2026-08-03', 'mm/dd/yyyy')).toBe('08/03/2026');
    expect(fmtDate('2026-08-03', 'yyyy-mm-dd')).toBe('2026-08-03');
  });

  it('luôn đệm số 0 phía trước', () => {
    expect(fmtDate('2026-01-05')).toBe('05/01/2026');
  });

  it('trả gạch ngang khi rỗng', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('')).toBe('—');
  });
});

describe('lịch sử điều chỉnh lãi suất', () => {
  const lichSu = [
    { id: '1', effectiveDate: '2026-01-01', ratePercent: 8 },
    { id: '2', effectiveDate: '2026-06-01', ratePercent: 10 },
  ];

  it('đọc được từ cột RateHistory dạng mảng', () => {
    expect(getContractRateHistory({ RateHistory: lichSu } as LoanContract)).toEqual(lichSu);
  });

  it('đọc được từ cột RateHistory dạng chuỗi JSON', () => {
    const c = { RateHistory: JSON.stringify(lichSu) } as unknown as LoanContract;
    expect(getContractRateHistory(c)).toEqual(lichSu);
  });

  it('đọc được từ trường Note của bản ghi cũ (chuỗi mã hoá)', () => {
    const c = { Note: serializeContractRateHistory(lichSu) } as LoanContract;
    expect(getContractRateHistory(c)).toEqual(lichSu);
  });

  it('không vỡ khi JSON hỏng, trả mảng rỗng', () => {
    expect(getContractRateHistory({ RateHistory: '{hỏng' } as unknown as LoanContract)).toEqual([]);
    expect(getContractRateHistory(null)).toEqual([]);
  });

  it('khứ hồi qua Note không mất dữ liệu', () => {
    const c = { Note: serializeContractRateHistory(lichSu) } as LoanContract;
    expect(getContractRateHistory(c)).toEqual(lichSu);
  });
});

describe('getEffectiveActiveRate', () => {
  const lichSu = [
    { id: '1', effectiveDate: '2026-01-01', ratePercent: 8 },
    { id: '2', effectiveDate: '2026-06-01', ratePercent: 10 },
  ];

  it('lấy mốc lãi suất có hiệu lực tại thời điểm xét', () => {
    const c = { RateHistory: lichSu } as LoanContract;
    expect(getEffectiveActiveRate(c, '2026-03-15')).toBeCloseTo(0.08);
    expect(getEffectiveActiveRate(c, '2026-07-15')).toBeCloseTo(0.10);
  });

  it('dùng mốc sớm nhất khi thời điểm xét nằm trước mọi mốc', () => {
    const c = { RateHistory: lichSu } as LoanContract;
    expect(getEffectiveActiveRate(c, '2025-01-01')).toBeCloseTo(0.08);
  });

  it('quay về InterestRate khi không có lịch sử', () => {
    expect(getEffectiveActiveRate({ InterestRate: 0.095 } as LoanContract)).toBeCloseTo(0.095);
  });

  it('mặc định 8.5% khi không có thông tin nào', () => {
    expect(getEffectiveActiveRate({} as LoanContract)).toBeCloseTo(0.085);
    expect(getEffectiveActiveRate(null)).toBeCloseTo(0.085);
  });
});

describe('getMasterHdtdNumber', () => {
  it('bóc số HĐTD gốc từ số KUNN', () => {
    const c = { ContractNumber: 'HD123/GNN-01' } as LoanContract;
    expect(getMasterHdtdNumber(c)).toBe('HD123');
  });

  it('KHÔNG bao giờ đọc số hợp đồng từ HdtdDueDate', () => {
    // Chống hồi quy: HdtdDueDate là cột timestamp, PostgREST trả về dạng
    // ISO đầy đủ. Thiết kế cũ từng lấy giá trị này làm số hợp đồng, khiến
    // dấu thời gian bị hiển thị ở vị trí số HĐTD và phá vỡ gom nhóm.
    const c = {
      ContractNumber: 'HD777/GNN-01',
      HdtdDueDate: '2026-05-28T00:00:00+00:00',
    } as LoanContract;
    expect(getMasterHdtdNumber(c)).toBe('HD777');
  });

  it('bỏ qua HdtdDueDate kể cả khi đó là ngày dạng ngắn', () => {
    const c = { ContractNumber: 'HD777', HdtdDueDate: '2026-08-03' } as LoanContract;
    expect(getMasterHdtdNumber(c)).toBe('HD777');
  });

  it('đọc từ Note khi hợp đồng cũ có ghi "HĐTD:"', () => {
    const c = { ContractNumber: 'HD001', Note: 'HĐTD: HD-MASTER-09' } as LoanContract;
    expect(getMasterHdtdNumber(c)).toBe('HD-MASTER-09');
  });

  it('trả nhãn mặc định khi không có gì', () => {
    expect(getMasterHdtdNumber({} as LoanContract)).toBe('HĐTD-CHÍNH');
  });
});
