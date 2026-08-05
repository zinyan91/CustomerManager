import { describe, it, expect } from 'vitest';
import {
  formatMoneyInput,
  parseMoneyInput,
  fmtRate,
  formatAssetType,
  parseAnyDate,
  toIsoDate,
  fmtPercent,
  todayIso,
  daysUntil,
  fmtDate,
  getContractRateHistory,
  serializeContractRateHistory,
  getEffectiveActiveRate,
  getMasterHdtdNumber,
} from '../utils';
import type { LoanContract } from '../../types';

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
    expect(fmtRate(0.085)).toBe('8,50%/năm');
    expect(fmtRate(8.5)).toBe('8,50%/năm');
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

describe('toIsoDate — chuẩn hoá ngày lấy từ database về một dạng', () => {
  /* HdtdDueDate từng là timestamptz nên trả về chuỗi có múi giờ, còn mọi cột
     ngày khác trả về dạng ngắn. So chuỗi trực tiếp giữa hai dạng đó là sai. */
  it('cắt phần giờ khỏi timestamptz, KHÔNG quy đổi múi giờ', () => {
    expect(toIsoDate('2026-05-28T00:00:00+00:00')).toBe('2026-05-28');
  });

  it('giữ nguyên ngày đã ở dạng ISO ngắn', () => {
    expect(toIsoDate('2026-08-03')).toBe('2026-08-03');
  });

  it('nhận cả ngày kiểu Việt Nam', () => {
    expect(toIsoDate('03/08/2026')).toBe('2026-08-03');
  });

  it('đệm 0 để so chuỗi ra đúng thứ tự', () => {
    expect(toIsoDate('2026-1-5')).toBe('2026-01-05');
  });

  it('so chuỗi giữa hai dạng cho đúng thứ tự sau khi chuẩn hoá', () => {
    const a = toIsoDate('2026-05-28T00:00:00+00:00')!;
    const b = toIsoDate('2026-09-23')!;
    expect(a < b).toBe(true);
  });

  it('không có ngày thì trả null, không trả chuỗi rỗng', () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate('')).toBeNull();
    expect(toIsoDate('—')).toBeNull();
  });
});

describe('getMasterHdtdNumber', () => {
  it('bóc số HĐTD gốc từ số KUNN', () => {
    const c = { ContractNumber: 'HD123/GNN-01' } as LoanContract;
    expect(getMasterHdtdNumber(c)).toBe('HD123');
  });

  it('KHÔNG bao giờ đọc số hợp đồng từ HdtdDueDate', () => {

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

describe('fmtPercent', () => {
  it('nhận tỷ lệ dạng thập phân và trả về phần trăm', () => {
    expect(fmtPercent(0.105)).toBe('10,50%');
  });

  it('giữ số 0 là giá trị hợp lệ, không rơi về fallback', () => {
    expect(fmtPercent(0)).toBe('0,00%');
  });

  it('trả fallback khi thiếu dữ liệu', () => {
    expect(fmtPercent(null)).toBe('—');
    expect(fmtPercent(undefined)).toBe('—');
    expect(fmtPercent(NaN)).toBe('—');
    expect(fmtPercent(null, '')).toBe('');
  });
});

describe('todayIso', () => {
  it('trả về ngày theo múi giờ máy, không lệch ngày như toISOString', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayIso()).toBe(expected);
  });
});

describe('daysUntil', () => {
  it('đếm số ngày còn lại tới mốc trong tương lai', () => {
    expect(daysUntil('2026-08-15', '2026-08-05')).toBe(10);
  });

  it('trả 0 khi đến hạn đúng hôm nay', () => {
    expect(daysUntil('2026-08-05', '2026-08-05')).toBe(0);
  });

  it('trả số âm khi mốc đã qua', () => {
    expect(daysUntil('2026-07-31', '2026-08-05')).toBe(-5);
  });

  it('không lệch một ngày khi khoảng thời gian vắt qua mốc đổi giờ mùa hè', () => {
    expect(daysUntil('2026-04-01', '2026-03-01')).toBe(31);
  });

  it('trả null khi thiếu ngày', () => {
    expect(daysUntil(null, '2026-08-05')).toBeNull();
    expect(daysUntil('', '2026-08-05')).toBeNull();
  });
});
