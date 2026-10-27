import { describe, expect, it } from 'vitest';
import {
  interestBetween, lastInterestDate, obligationAtDue, outstandingPrincipal, overdueDays,
  pledgeLoanDebtGroup, pledgeLoanStatus, pledgeLoanWarnings, quoteRepayment,
} from '../pledgeLoan';
import { CC_0418, CC_0907, LINKS, STK_001, STK_002, repayment } from './fixtures/savingsPledgeSample';

const partial100 = repayment({ Id: 1, PledgeLoanId: 10, RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 100000000, InterestPaid: 9189041 });

describe('lai va du no', () => {
  it('lai theo ngay thuc te / 365', () => {
    expect(interestBetween(400000000, 6.5, '2026-06-20', '2026-10-27')).toBe(9189041);
  });
  it('nghia vu den han ca ky', () => {
    expect(obligationAtDue(CC_0418, [])).toBe(417095890);
    expect(obligationAtDue(CC_0907, [])).toBe(358798904);
  });
  it('sau tra truoc mot phan, ky sau tinh tu ngay tra tren du no con lai', () => {
    expect(outstandingPrincipal(CC_0418, [partial100])).toBe(300000000);
    expect(lastInterestDate(CC_0418, [partial100])).toBe('2026-10-27');
    expect(obligationAtDue(CC_0418, [partial100])).toBe(300000000 + 5930137);
  });
  it('bat bien: tong goc da tra + du no = so tien vay', () => {
    const reps = [partial100, repayment({ Id: 2, PledgeLoanId: 10, RepaymentDate: '2026-12-01', Kind: 'partial', PrincipalPaid: 50000000 })];
    const paid = reps.reduce((s, r) => s + r.PrincipalPaid, 0);
    expect(paid + outstandingPrincipal(CC_0418, reps)).toBe(CC_0418.Amount);
  });
  it('chi tinh dong tra cua dung khoan vay', () => {
    const other = repayment({ Id: 3, PledgeLoanId: 99, RepaymentDate: '2026-11-01', Kind: 'partial', PrincipalPaid: 1 });
    expect(outstandingPrincipal(CC_0418, [other])).toBe(400000000);
    expect(lastInterestDate(CC_0418, [other])).toBe('2026-06-20');
  });
});

describe('quoteRepayment', () => {
  it('tra truoc mot phan: lai tren toan bo du no den ngay tra', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'partial', date: '2026-10-27', principal: 100000000 });
    expect(q).toMatchObject({ ok: true, interest: 9189041, principal: 100000000, total: 109189041, remainingPrincipal: 300000000, nextInterestFrom: '2026-10-27' });
  });

  it('tra toan bo truoc han', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'full', date: '2026-10-27' });
    expect(q).toMatchObject({ ok: true, interest: 9189041, principal: 400000000, total: 409189041, remainingPrincipal: 0, nextInterestFrom: null });
  });

  it('tra khi den han lay ngay den han', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'due', date: '2026-10-27' });
    expect(q).toMatchObject({ ok: true, interest: 17095890, total: 417095890, principalPenalty: 0, interestPenalty: 0 });
  });

  it('tat toan so de can tru truoc dao han', () => {
    const q = quoteRepayment({
      loan: CC_0418, repayments: [], kind: 'offset', date: '2026-10-27',
      offsetBook: STK_001, offsetBookOtherLoans: ['CC-2026-0907'],
    });
    expect(q.ok).toBe(true);
    expect(q.total).toBe(409189041);
    expect(q.offset).toEqual({ early: true, savingsRatePercent: 0.2, savingsInterest: 534247, savingsTotal: 500534247, balance: 91345206 });
    expect(q.warnings).toContain('Sổ STK-0123-001 còn bảo đảm cho CC-2026-0907. Tất toán sổ phải xử lý cả khoản đó.');
  });

  it('tat toan so dung ngay dao han dung lai suat co ky han', () => {
    const q = quoteRepayment({ loan: CC_0907, repayments: [], kind: 'offset', date: '2027-02-02', offsetBook: STK_002 });
    expect(q.offset).toMatchObject({ early: false, savingsRatePercent: 4.7, savingsTotal: 307107945 });
    expect(q.offset?.balance).toBe(307107945 - 358798904);
  });

  it('canh bao tat toan truoc dao han', () => {
    const q = quoteRepayment({ loan: CC_0907, repayments: [], kind: 'offset', date: '2026-10-27', offsetBook: STK_002 });
    expect(q.warnings).toContain('Tất toán trước ngày đáo hạn 02/02/2027: lãi sổ tính theo lãi suất không kỳ hạn.');
  });

  it('tra tre 10 ngay: lai trong han den ngay den han va phat qua han', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'full', date: '2027-02-25' });
    expect(q).toMatchObject({ ok: true, interest: 17095890, principalPenalty: 1068493, interestPenalty: 46838, total: 418211221 });
  });

  it('goc tra truoc mot phan bang 0 hoac >= du no bi tu choi', () => {
    for (const principal of [0, 400000000, 500000000]) {
      const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'partial', date: '2026-10-27', principal });
      expect(q.ok).toBe(false);
      expect(q.error).toBe('Gốc trả trước một phần phải lớn hơn 0 và nhỏ hơn dư nợ 400.000.000.');
    }
  });

  it('ngay tra truoc ngay tinh lai gan nhat bi tu choi', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [partial100], kind: 'full', date: '2026-10-01' });
    expect(q.ok).toBe(false);
    expect(q.error).toBe('Ngày trả phải từ ngày 27/10/2026 trở đi.');
  });

  it('khoan da tat toan bi tu choi', () => {
    const q = quoteRepayment({ loan: { ...CC_0418, IsClosed: true }, repayments: [], kind: 'full', date: '2026-10-27' });
    expect(q).toMatchObject({ ok: false, error: 'Khoản vay đã tất toán.' });
  });

  it('can tru thieu so bi tu choi', () => {
    const q = quoteRepayment({ loan: CC_0418, repayments: [], kind: 'offset', date: '2026-10-27' });
    expect(q).toMatchObject({ ok: false, error: 'Chọn sổ tiết kiệm để tất toán.' });
  });
});

describe('qua han, nhom no, trang thai', () => {
  it('so ngay qua han va nhom no', () => {
    expect(overdueDays(CC_0418, [], '2027-02-15')).toBe(0);
    expect(overdueDays(CC_0418, [], '2027-02-25')).toBe(10);
    expect(pledgeLoanDebtGroup(CC_0418, [], '2027-02-25')).toBe(2);
    expect(pledgeLoanDebtGroup(CC_0418, [], '2027-02-20')).toBe(1);
    expect(overdueDays({ ...CC_0418, IsClosed: true }, [], '2027-03-25')).toBe(0);
  });

  it('bon nhan trang thai o cac ngay bien', () => {
    expect(pledgeLoanStatus(CC_0418, [], '2027-01-16')).toEqual({ tone: 'warn', label: 'Đến hạn sau 30 ngày' });
    expect(pledgeLoanStatus(CC_0418, [], '2027-01-15')).toEqual({ tone: 'pos', label: 'Trong hạn' });
    expect(pledgeLoanStatus(CC_0418, [], '2027-02-16')).toEqual({ tone: 'neg', label: 'Quá hạn 1 ngày' });
    expect(pledgeLoanStatus({ ...CC_0418, IsClosed: true }, [], '2027-02-16')).toEqual({ tone: 'mute', label: 'Đã tất toán' });
  });
});

describe('pledgeLoanWarnings', () => {
  it('khong canh bao voi bo mau hop le', () => {
    expect(pledgeLoanWarnings(CC_0907, LINKS, [STK_001, STK_002], [CC_0418, CC_0907], [])).toEqual([]);
  });
  it('ngay den han vuot dao han som nhat cua so', () => {
    const late = { ...CC_0907, DueDate: '2027-03-01' };
    expect(pledgeLoanWarnings(late, LINKS, [STK_001, STK_002], [CC_0418, late], []))
      .toContain('Ngày đến hạn vượt ngày đáo hạn sớm nhất của sổ bảo đảm.');
  });
  it('nghia vu vuot kha nang bao dam cua so', () => {
    const big = { ...CC_0907, Amount: 360000000 };
    const links = LINKS.map((l) => (l.Id === 101 ? { ...l, PrincipalCovered: 300000000 } : l));
    expect(pledgeLoanWarnings(big, links, [STK_001, STK_002], [CC_0418, big], []))
      .toContain('Nghĩa vụ vượt khả năng bảo đảm của sổ STK-0123-002.');
  });
});
