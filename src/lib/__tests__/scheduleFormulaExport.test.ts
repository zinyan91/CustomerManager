import { describe, it, expect } from 'vitest';
import { buildScheduleWithFormulasXlsx, type ExportScheduleFormulaOptions } from '../scheduleFormulaExport';
import { buildLoanSchedule, postPromoRateAnnual, type LoanScheduleParams } from '../calcMath';

function readStoredEntry(zip: Uint8Array, entryName: string): string {
  const text = new TextDecoder('latin1').decode(zip);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  let headerAt = -1;
  for (let at = text.indexOf(entryName); at >= 0; at = text.indexOf(entryName, at + 1)) {
    if (at >= 30 && view.getUint32(at - 30, true) === 0x04034b50) {
      headerAt = at - 30;
      break;
    }
  }
  expect(headerAt).toBeGreaterThanOrEqual(0);
  const size = view.getUint32(headerAt + 18, true);
  const nameLen = view.getUint16(headerAt + 26, true);
  const start = headerAt + 30 + nameLen;
  return new TextDecoder('utf-8').decode(zip.subarray(start, start + size));
}

function sheetOf(opts: ExportScheduleFormulaOptions): string {
  return readStoredEntry(buildScheduleWithFormulasXlsx(opts), 'xl/worksheets/sheet1.xml');
}

function optsFor(params: LoanScheduleParams, over: Partial<ExportScheduleFormulaOptions> = {}): ExportScheduleFormulaOptions {
  const scheduleRows = buildLoanSchedule(params);
  return {
    loanAmount: params.loanAmount,
    tenorMonths: params.tenorMonths,
    annualRate: params.promoRateAnnual,
    promoMonths: params.promoMonths ?? 0,
    baseRateAnnual: params.baseRateAnnual ?? params.promoRateAnnual,
    marginAnnual: params.marginAnnual ?? 0,
    postPromoRate: postPromoRateAnnual(params),
    postPromoRateFixed: (params.postPromoRateOverride ?? null) !== null,
    principalGraceMonths: params.principalGraceMonths ?? 0,
    repayMethod: params.repayMethod,
    disbursementDateStr: params.disbursementDate,
    firstPaymentDateStr: scheduleRows[0].dueDate,
    prepayments: params.prepayments ?? [],
    scheduleRows,
    ...over,
  };
}

const PLAIN: LoanScheduleParams = {
  loanAmount: 120000000,
  tenorMonths: 12,
  promoRateAnnual: 10,
  disbursementDate: '2026-01-01',
  repayMethod: 'equal_principal',
};

describe('scheduleFormulaExport', () => {
  it('xuất được workbook bytes', () => {
    const bytes = buildScheduleWithFormulasXlsx(optsFor(PLAIN));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it('ghi đủ khối tham số: ưu đãi, cơ sở, biên độ, ân hạn, ngày bắt đầu trả nợ, trả trước hạn', () => {
    const xml = sheetOf(optsFor({
      ...PLAIN,
      principalGraceMonths: 3,
      promoMonths: 6,
      baseRateAnnual: 9.7,
      marginAnnual: 3.75,
      prepayments: [{ period: 4, amount: 20000000, mode: 'reduce_monthly' }],
    }));

    for (const label of [
      'Số tháng ưu đãi:',
      'Lãi suất cơ sở (%/năm):',
      'Biên độ (%/năm):',
      'Lãi suất sau ưu đãi (%/năm):',
      'Ân hạn gốc (tháng):',
      'Ngày bắt đầu trả nợ:',
      'Mức gốc đều mỗi kỳ (VNĐ):',
      'Trả nợ trước hạn:',
    ]) {
      expect(xml).toContain(label);
    }
    expect(xml).toContain('Kỳ 4: 20.000.000');
  });

  it('lãi suất sau ưu đãi là công thức cơ sở + biên độ khi không nhập đè', () => {
    const withMargin = sheetOf(optsFor({ ...PLAIN, promoMonths: 6, baseRateAnnual: 9.7, marginAnnual: 3.75 }));
    expect(withMargin).toContain('<f>$B$5+$D$5</f>');

    const overridden = sheetOf(optsFor({
      ...PLAIN, promoMonths: 6, baseRateAnnual: 9.7, marginAnnual: 3.75, postPromoRateOverride: 12,
    }));
    expect(overridden).not.toContain('<f>$B$5+$D$5</f>');
  });

  it('mức gốc đều làm tròn lên bội 10.000 và trừ số tháng ân hạn', () => {
    const xml = sheetOf(optsFor({ ...PLAIN, principalGraceMonths: 3 }));
    expect(xml).toContain('CEILING($B$3/($D$3-$D$6), 10000)');
  });

  it('cột gốc theo lịch trả 0 trong kỳ ân hạn và quét sạch dư nợ ở kỳ cuối', () => {
    const opts = optsFor({ ...PLAIN, principalGraceMonths: 3 });
    const xml = sheetOf(opts);
    expect(xml).toContain('IF(A12&lt;=$D$6, 0, IF(A12=$D$3, F12, MIN(F12, G12)))');
    expect(opts.scheduleRows[0].scheduledPrincipal).toBe(0);
    expect(opts.scheduleRows[opts.scheduleRows.length - 1].endingBalance).toBe(0);
  });

  it('lãi suất mỗi kỳ trỏ về ô tham số ưu đãi / sau ưu đãi', () => {
    const xml = sheetOf(optsFor({ ...PLAIN, promoMonths: 6, baseRateAnnual: 9.7, marginAnnual: 3.75 }));
    expect(xml).toContain('IF($D$4&gt;0, IF(A12&lt;=$D$4, $B$4, $B$6), $B$4)');
  });

  it('nhánh bullet chỉ trả gốc ở kỳ cuối, không dùng cột gốc đều', () => {
    const xml = sheetOf(optsFor({ ...PLAIN, repayMethod: 'bullet' }));
    expect(xml).toContain('IF(A12=$D$3, F12, 0)');
    expect(xml).not.toContain('CEILING(');
  });

  it('trả trước hạn giảm gốc kỳ làm cột gốc đều tính lại từ dư nợ còn lại', () => {
    const xml = sheetOf(optsFor({
      ...PLAIN,
      prepayments: [{ period: 3, amount: 30000000, mode: 'reduce_monthly' }],
    }));
    expect(xml).toContain('CEILING(M14/($D$3-MAX(A14,$D$6)), 10000)');
  });

  it('không cộng đôi khoản trả trước hạn vào tổng gốc trả', () => {
    const opts = optsFor({
      ...PLAIN,
      prepayments: [{ period: 3, amount: 30000000, mode: 'reduce_monthly' }],
    });
    const row3 = opts.scheduleRows.find(r => r.period === 3)!;
    expect(row3.prepayment).toBeGreaterThan(0);
    expect(row3.principal).toBe(row3.scheduledPrincipal + row3.prepayment);

    const xml = sheetOf(opts);
    const cached = [...xml.matchAll(/<c r="J(\d+)"[^>]*><f>[^<]*<\/f><v>(\d+)<\/v><\/c>/g)]
      .filter(m => Number(m[1]) >= 12 && Number(m[1]) < 12 + opts.scheduleRows.length)
      .map(m => Number(m[2]));
    expect(cached).toEqual(opts.scheduleRows.map(r => r.principal));
    expect(cached.reduce((a, b) => a + b, 0)).toBe(opts.loanAmount);
  });

  describe('gốc lãi trả đều mỗi tháng cố định', () => {
    const ANNUITY = { ...PLAIN, tenorMonths: 24, repayMethod: 'equal_installment' as const };

    it('ô neo là PMT làm tròn lên bội 1.000', () => {
      const xml = sheetOf(optsFor(ANNUITY));
      expect(xml).toContain('Số tiền trả đều mỗi kỳ (VNĐ):');
      expect(xml).toContain('CEILING(PMT($B$4/100/12, $D$3, -$B$3), 1000)');
    });

    it('lãi tính theo tháng, không theo số ngày', () => {
      const xml = sheetOf(optsFor(ANNUITY));
      expect(xml).toContain('ROUND(F12*(E12/100)/12, 0)');
      expect(xml).not.toContain('/365');
    });

    it('gốc theo lịch = số tiền trả đều trừ lãi, kỳ cuối quét sạch dư nợ', () => {
      const xml = sheetOf(optsFor(ANNUITY));
      expect(xml).toContain('IF(A12=$D$3, F12, MIN(F12, MAX(0, G12-K12)))');
    });

    it('bỏ qua ưu đãi và ân hạn dù người dùng có khai', () => {
      const xml = sheetOf(optsFor({
        ...ANNUITY, promoMonths: 6, baseRateAnnual: 12, marginAnnual: 3, principalGraceMonths: 6,
      }));
      expect(xml).toContain('<f>$B$4</f>');
      expect(xml).not.toContain('<f>$B$5+$D$5</f>');
      expect(xml).not.toContain('IF($D$4&gt;0');
    });

    it('trả trước hạn giảm gốc kỳ thì tính lại PMT trên dư nợ và số kỳ còn lại', () => {
      const xml = sheetOf(optsFor({
        ...ANNUITY, tenorMonths: 60,
        prepayments: [{ period: 12, amount: 30000000, mode: 'reduce_monthly' }],
      }));
      expect(xml).toContain('CEILING(PMT($B$4/100/12, $D$3-A23, -M23), 1000)');
    });

    it('giá trị cache cột tổng gốc trả khớp lịch và cộng đủ số tiền vay', () => {
      const opts = optsFor(ANNUITY);
      const xml = sheetOf(opts);
      const cached = [...xml.matchAll(/<c r="J(\d+)"[^>]*><f>[^<]*<\/f><v>(\d+)<\/v><\/c>/g)]
        .filter(m => Number(m[1]) >= 12 && Number(m[1]) < 12 + opts.scheduleRows.length)
        .map(m => Number(m[2]));
      expect(cached).toEqual(opts.scheduleRows.map(r => r.principal));
      expect(cached.reduce((a, b) => a + b, 0)).toBe(opts.loanAmount);
    });
  });

  it('công thức không mang dấu bằng thừa trong OOXML', () => {
    const xml = sheetOf(optsFor(PLAIN));
    expect(xml).not.toContain('<f>=');
  });
});
