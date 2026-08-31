import { describe, it, expect } from 'vitest';
import {
  addTenor, accruedInterest, calcStkPledge, buildStkRollover, calcOverduePenalty,
  DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER, DEFAULT_INTEREST_PENALTY_RATE,
} from '../stkPledge';

describe('addTenor', () => {
  it('adds months with EDATE semantics', () => {
    expect(addTenor('2026-05-20', 6, 'thang')).toBe('2026-11-20');
    expect(addTenor('2026-08-31', 1, 'thang')).toBe('2026-09-30');
  });

  it('adds years as twelve months', () => {
    expect(addTenor('2026-02-27', 1, 'nam')).toBe('2027-02-27');
  });

  it('adds weeks and plain days', () => {
    expect(addTenor('2026-05-20', 2, 'tuan')).toBe('2026-06-03');
    expect(addTenor('2026-05-20', 10, 'ngay')).toBe('2026-05-30');
  });

  it('returns empty for unusable input', () => {
    expect(addTenor('', 6, 'thang')).toBe('');
    expect(addTenor('2026-05-20', 0, 'thang')).toBe('');
  });
});

describe('accruedInterest', () => {
  it('uses actual days over 365', () => {
    expect(accruedInterest(450_000_000, 0.082, 184))
      .toBe(Math.round(450_000_000 * 0.082 * 184 / 365));
  });

  it('is zero when there are no days or no principal', () => {
    expect(accruedInterest(450_000_000, 0.082, 0)).toBe(0);
    expect(accruedInterest(0, 0.082, 184)).toBe(0);
  });
});

describe('calcStkPledge — đối chiếu bảng tính mẫu', () => {
  const sample = calcStkPledge({
    savingsAmount: 450_000_000,
    pledgeRatio: 150 / 450,
    depositDate: '2026-05-20',
    tenor: 6,
    tenorUnit: 'thang',
    savingsRateAnnual: 0.082,
    loanRateAnnual: 0.11,
    disbursementDate: '2026-07-27',
    loanDueDate: '2026-11-20',
  });

  it('derives the loan amount from the pledge ratio', () => {
    expect(sample.loanAmount).toBe(150_000_000);
  });

  it('matches the savings side of the sample sheet', () => {
    expect(sample.savingsDueDate).toBe('2026-11-20');
    expect(sample.savingsDays).toBe(184);
    expect(sample.savingsInterest).toBe(18_601_644);
  });

  it('matches the loan side of the sample sheet', () => {
    expect(sample.loanDays).toBe(116);
    expect(sample.loanInterest).toBe(5_243_836);
  });

  it('matches the summary of the sample sheet', () => {
    expect(sample.netGain).toBe(18_601_644 - 5_243_836);
    expect(sample.totalRepayment).toBe(155_243_836);
  });

  it('tổng gốc + lãi sổ nhận được khi đáo hạn', () => {
    expect(sample.savingsTotal).toBe(450_000_000 + 18_601_644);
  });

  it('falls back to the savings maturity when no loan due date is given', () => {
    const r = calcStkPledge({
      savingsAmount: 450_000_000, pledgeRatio: 1 / 3,
      depositDate: '2026-05-20', tenor: 6, tenorUnit: 'thang',
      savingsRateAnnual: 0.082, loanRateAnnual: 0.11,
      disbursementDate: '2026-07-27',
    });
    expect(r.loanDueDate).toBe('2026-11-20');
  });

  it('sổ chưa sinh lãi thì tổng gốc + lãi bằng đúng gốc', () => {
    const r = calcStkPledge({
      savingsAmount: 450_000_000, pledgeRatio: 1 / 3,
      depositDate: '2026-05-20', tenor: 0, tenorUnit: 'thang',
      savingsRateAnnual: 0.082, loanRateAnnual: 0.11,
      disbursementDate: '2026-07-27',
    });
    expect(r.savingsInterest).toBe(0);
    expect(r.savingsTotal).toBe(450_000_000);
  });

  it('reports a negative gain when the loan costs more than the savings earn', () => {
    const r = calcStkPledge({
      savingsAmount: 100_000_000, pledgeRatio: 1,
      depositDate: '2026-01-01', tenor: 12, tenorUnit: 'thang',
      savingsRateAnnual: 0.05, loanRateAnnual: 0.12,
      disbursementDate: '2026-01-01',
    });
    expect(r.netGain).toBeLessThan(0);
  });

  describe('Quy chế TSBĐ: 1. Tiền gửi (TG) VND', () => {
    it('Lãnh lãi cuối kỳ: Thỏa mãn P + I_vay <= Gốc + I_gửi - Thu hồi', () => {
      const r = calcStkPledge({
        depositType: 'tg_vnd',
        interestPaymentMethod: 'end_term',
        savingsAmount: 500_000_000,
        depositDate: '2026-01-01',
        tenor: 6,
        tenorUnit: 'thang',
        savingsRateAnnual: 0.06,
        loanRateAnnual: 0.08,
        disbursementDate: '2026-01-01',
        loanDueDate: '2026-07-01',
        clawbackAmount: 2_000_000,
        customLoanAmount: 480_000_000,
      });

      expect(r.maxPrincipalCap).toBe(500_000_000);
      expect(r.isSameMaturity).toBe(true);
      expect(r.savingsProjectedInterest).toBe(Math.round(500_000_000 * 0.06 * 181 / 365));
      expect(r.maxRecoveryBound).toBe(500_000_000 + r.savingsProjectedInterest - 2_000_000);
      expect(r.totalObligation).toBe(480_000_000 + r.loanInterest);
      expect(r.isValidLoan).toBe(true);
      expect(r.exceedsPrincipalCap).toBe(false);
      expect(r.exceedsRecoveryBound).toBe(false);
    });

    it('Lãnh lãi trước / định kỳ: Thỏa mãn P + I_vay <= Gốc - I_đã chi - I_gửi - Thu hồi', () => {
      const r = calcStkPledge({
        depositType: 'tg_vnd',
        interestPaymentMethod: 'upfront',
        savingsAmount: 1_000_000_000,
        depositDate: '2026-01-01',
        tenor: 12,
        tenorUnit: 'thang',
        savingsRateAnnual: 0.07,
        loanRateAnnual: 0.09,
        disbursementDate: '2026-01-01',
        loanDueDate: '2027-01-01',
        paidInterest: 70_000_000,
        clawbackAmount: 5_000_000,
        customLoanAmount: 900_000_000,
      });

      // Trần bảo đảm: 1.000.000.000 - 70.000.000 - 70.000.000 (lãi dự kiến) - 5.000.000 = 855.000.000
      expect(r.maxRecoveryBound).toBe(1_000_000_000 - 70_000_000 - r.savingsProjectedInterest - 5_000_000);
      // Vay 900 triệu + lãi vay ~ 81 triệu = 981 triệu > 855 triệu -> vi phạm
      expect(r.exceedsRecoveryBound).toBe(true);
      expect(r.isValidLoan).toBe(false);
      expect(r.maxAllowableLoan).toBeLessThan(800_000_000);
    });
  });

  describe('Quy chế TSBĐ: 2. Tiền gửi ngoại tệ', () => {
    it('Quy đổi tỷ giá và thỏa mãn LTV + P_VND + I_vay_VND <= Gốc quy đổi VND', () => {
      const r = calcStkPledge({
        depositType: 'tg_foreign',
        currency: 'USD',
        exchangeRate: 25_450,
        savingsAmount: 20_000, // 20.000 USD
        depositDate: '2026-03-01',
        tenor: 6,
        tenorUnit: 'thang',
        savingsRateAnnual: 0.01,
        loanRateAnnual: 0.08,
        disbursementDate: '2026-03-01',
        loanDueDate: '2026-09-01',
        customLtvPercent: 90,
      });

      const expectedVnd = 20_000 * 25_450; // 509.000.000
      expect(r.savingsPrincipalVnd).toBe(expectedVnd);
      expect(r.maxPrincipalCap).toBe(Math.round(expectedVnd * 0.9)); // 458.100.000
      expect(r.maxRecoveryBound).toBe(expectedVnd); // 509.000.000
      expect(r.loanAmount).toBe(r.maxAllowableLoan);
      expect(r.totalObligation).toBeLessThanOrEqual(r.maxRecoveryBound);
      expect(r.loanAmount).toBeLessThanOrEqual(r.maxPrincipalCap);
      expect(r.isValidLoan).toBe(true);
    });
  });

  describe('Quy chế TSBĐ: 3. Chứng chỉ tiền gửi (CCTG)', () => {
    it('CCTG lãnh lãi trước / định kỳ áp dụng công thức khấu trừ lãi đã chi và thu hồi', () => {
      const r = calcStkPledge({
        depositType: 'cctg',
        interestPaymentMethod: 'periodic',
        savingsAmount: 300_000_000,
        depositDate: '2026-01-15',
        tenor: 12,
        tenorUnit: 'thang',
        savingsRateAnnual: 0.075,
        loanRateAnnual: 0.095,
        disbursementDate: '2026-01-15',
        loanDueDate: '2027-01-15',
        paidInterest: 11_250_000,
        clawbackAmount: 1_000_000,
      });

      expect(r.maxPrincipalCap).toBe(300_000_000);
      expect(r.maxRecoveryBound).toBe(300_000_000 - 11_250_000 - r.savingsProjectedInterest - 1_000_000);
      expect(r.maxAllowableLoan).toBeLessThan(300_000_000);
    });
  });

  describe('Quy chế TSBĐ: Lãi gửi dự kiến khi lệch ngày đáo hạn (Lãi suất không kỳ hạn)', () => {
    it('Chuyển sang tính lãi suất không kỳ hạn khi ngày đáo hạn vay khác ngày đáo hạn sổ', () => {
      const r = calcStkPledge({
        depositType: 'tg_vnd',
        interestPaymentMethod: 'end_term',
        savingsAmount: 200_000_000,
        depositDate: '2026-01-01',
        tenor: 12,
        tenorUnit: 'thang', // Đáo hạn sổ: 2027-01-01 (365 ngày)
        savingsRateAnnual: 0.07, // 7%/năm
        nonTermRateAnnual: 0.002, // 0.2%/năm
        loanRateAnnual: 0.09,
        disbursementDate: '2026-01-01',
        loanDueDate: '2026-04-01', // Vay 3 tháng (90 ngày)
      });

      expect(r.isSameMaturity).toBe(false);
      expect(r.appliedSavingsRate).toBe(0.002);
      expect(r.savingsProjectedDays).toBe(90);
      expect(r.savingsProjectedInterest).toBe(Math.round(200_000_000 * 0.002 * 90 / 365));
      expect(r.savingsInterest).toBe(r.savingsProjectedInterest);
      expect(r.savingsNetReceived).toBe(200_000_000 + r.savingsInterest);
    });
  });

  describe('Cầm cố nhiều khoản vay trên cùng 1 sổ tiết kiệm', () => {
    it('Tính tổng tiền vay, tổng lãi vay và kiểm tra hạn mức theo tổng các khoản', () => {
      const r = calcStkPledge({
        depositType: 'tg_vnd',
        interestPaymentMethod: 'end_term',
        savingsAmount: 1_000_000_000,
        depositDate: '2026-01-01',
        tenor: 12,
        tenorUnit: 'thang',
        savingsRateAnnual: 0.07,
        loans: [
          {
            id: 'loan-1',
            name: 'Khoản 1',
            loanAmount: 400_000_000,
            loanRateAnnual: 0.085,
            disbursementDate: '2026-01-01',
            loanDueDate: '2026-07-01',
          },
          {
            id: 'loan-2',
            name: 'Khoản 2',
            loanAmount: 300_000_000,
            loanRateAnnual: 0.09,
            disbursementDate: '2026-03-01',
            loanDueDate: '2027-01-01',
          },
        ],
      });

      expect(r.maxPrincipalCap).toBe(1_000_000_000);
      expect(r.loanAmount).toBe(700_000_000);
      expect(r.loanItems.length).toBe(2);
      expect(r.loanItems[0].loanAmount).toBe(400_000_000);
      expect(r.loanItems[1].loanAmount).toBe(300_000_000);
      expect(r.loanInterest).toBe(r.loanItems[0].loanInterest + r.loanItems[1].loanInterest);
      expect(r.totalRepayment).toBe(700_000_000 + r.loanInterest);
      expect(r.remainingLoanCapacity).toBe(300_000_000);
      expect(r.isValidLoan).toBe(true);
    });
  });
});

describe('buildStkRollover — đối chiếu bảng tính mẫu', () => {
  const result = buildStkRollover({
    loanAmount: 500_000_000,
    loanRateAnnual: 0.105,
    disbursementDate: '2026-02-27',
    loanDueDate: '2027-02-27',
    initialSavingsAmount: 500_000_000,
    firstDepositDate: '2026-02-27',
    cycles: [
      { tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.075, pledgeRatio: 1 },
      { tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.068, pledgeRatio: 1 },
      { tenor: 6, tenorUnit: 'thang', savingsRateAnnual: 0.065, pledgeRatio: 1 },
    ],
  });

  it('matches the loan cost of the sample sheet', () => {
    expect(result.loanDays).toBe(365);
    expect(result.loanInterest).toBe(52_500_000);
  });

  it('rolls each cycle onto the previous balance and date', () => {
    expect(result.rows[0].openingPrincipal).toBe(500_000_000);
    expect(result.rows[0].dueDate).toBe('2026-08-27');
    expect(result.rows[1].openingPrincipal).toBe(result.rows[0].closingBalance);
    expect(result.rows[1].depositDate).toBe('2026-08-27');
    expect(result.rows[2].depositDate).toBe('2027-02-27');
  });

  it('matches the per-cycle interest of the sample sheet', () => {
    expect(result.rows[0].days).toBe(181);
    expect(result.rows[0].interest).toBe(18_595_890);
    expect(result.rows[1].days).toBe(184);
    expect(result.rows[2].days).toBe(181);
  });

  it('matches the summary of the sample sheet', () => {
    expect(result.finalBalance).toBe(
      result.rows[result.rows.length - 1].closingBalance
    );
    expect(result.totalSavingsInterest).toBe(
      result.rows.reduce((s, r) => s + r.interest, 0)
    );
    expect(result.netGain).toBe(result.totalSavingsInterest - result.loanInterest);
    expect(result.totalRepayment).toBe(552_500_000);
  });

  it('reports the pledge capacity of each cycle', () => {
    expect(result.rows[0].pledgeCapacity).toBe(result.rows[0].closingBalance);
    const half = buildStkRollover({
      loanAmount: 100_000_000, loanRateAnnual: 0.1,
      disbursementDate: '2026-01-01', loanDueDate: '2027-01-01',
      initialSavingsAmount: 200_000_000, firstDepositDate: '2026-01-01',
      cycles: [{ tenor: 12, tenorUnit: 'thang', savingsRateAnnual: 0.06, pledgeRatio: 0.5 }],
    });
    expect(half.rows[0].pledgeCapacity).toBe(Math.round(half.rows[0].closingBalance * 0.5));
  });

  it('is safe with no cycles at all', () => {
    const r = buildStkRollover({
      loanAmount: 100_000_000, loanRateAnnual: 0.1,
      disbursementDate: '2026-01-01', loanDueDate: '2027-01-01',
      initialSavingsAmount: 100_000_000, firstDepositDate: '2026-01-01',
      cycles: [],
    });
    expect(r.rows).toEqual([]);
    expect(r.totalSavingsInterest).toBe(0);
    expect(r.finalBalance).toBe(100_000_000);
  });
});

describe('calcOverduePenalty — đối chiếu bảng tính mẫu', () => {
  const hd001 = calcOverduePenalty({
    overduePrincipal: 900_000_000,
    normalRateAnnual: 0.065,
    principalOverdueDays: 15,
    unpaidInterest: 12_000_000,
    interestOverdueDays: 15,
  });

  it('charges 150% of the normal rate on overdue principal', () => {
    expect(hd001.principalPenaltyRate).toBeCloseTo(0.0975, 10);
    expect(hd001.principalPenalty).toBe(3_606_164);
  });

  it('charges 10% a year on interest paid late', () => {
    expect(hd001.interestPenaltyRate).toBe(DEFAULT_INTEREST_PENALTY_RATE);
    expect(hd001.interestPenalty).toBe(49_315);
  });

  it('totals principal, unpaid interest and both penalties', () => {
    expect(hd001.totalDue).toBe(900_000_000 + 12_000_000 + 3_606_164 + 49_315);
  });

  it('matches the second sample row', () => {
    const hd002 = calcOverduePenalty({
      overduePrincipal: 425_000_000,
      normalRateAnnual: 0.07,
      principalOverdueDays: 30,
      unpaidInterest: 8_500_000,
      interestOverdueDays: 30,
    });
    expect(hd002.principalPenaltyRate).toBeCloseTo(0.105, 10);
    expect(hd002.principalPenalty).toBe(3_667_808);
    expect(hd002.interestPenalty).toBe(69_863);
  });

  it('lets the multiplier and the interest penalty rate be overridden', () => {
    const r = calcOverduePenalty({
      overduePrincipal: 100_000_000, normalRateAnnual: 0.1,
      principalOverdueDays: 365, unpaidInterest: 0, interestOverdueDays: 0,
      principalPenaltyMultiplier: 2, interestPenaltyRateAnnual: 0.05,
    });
    expect(r.principalPenaltyRate).toBeCloseTo(0.2, 10);
    expect(r.principalPenalty).toBe(20_000_000);
    expect(r.interestPenaltyRate).toBe(0.05);
  });

  it('uses the 150% default when no multiplier is supplied', () => {
    expect(DEFAULT_PRINCIPAL_PENALTY_MULTIPLIER).toBe(1.5);
  });

  it('charges nothing when nothing is overdue', () => {
    const r = calcOverduePenalty({
      overduePrincipal: 0, normalRateAnnual: 0.1, principalOverdueDays: 0,
      unpaidInterest: 0, interestOverdueDays: 0,
    });
    expect(r.totalDue).toBe(0);
  });
});
