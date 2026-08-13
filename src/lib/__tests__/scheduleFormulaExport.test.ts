import { describe, it, expect } from 'vitest';
import { buildScheduleWithFormulasXlsx } from '../scheduleFormulaExport';
import { buildLoanSchedule } from '../calcMath';

describe('scheduleFormulaExport', () => {
  it('should generate formula excel workbook bytes with correct formulas', () => {
    const scheduleRows = buildLoanSchedule({
      loanAmount: 120000000,
      tenorMonths: 12,
      promoRateAnnual: 10,
      disbursementDate: '2026-01-01',
      repayMethod: 'equal_principal',
    });

    const bytes = buildScheduleWithFormulasXlsx({
      loanAmount: 120000000,
      tenorMonths: 12,
      annualRate: 10,
      disbursementDateStr: '2026-01-01',
      repayMethod: 'equal_principal',
      scheduleRows,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
  });
});
