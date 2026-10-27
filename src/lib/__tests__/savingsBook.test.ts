import { describe, expect, it } from 'vitest';
import {
  allocateObligations, savingsFreeCapacity, savingsMaturityDate, savingsPledgeCapacity, savingsPrincipalVnd,
} from '../savingsBook';
import { CC_0418, CC_0907, LINKS, STK_001, STK_002, STK_003, book, link, loan, repayment } from './fixtures/savingsPledgeSample';

describe('savingsMaturityDate', () => {
  it('tinh tu ngay gui va ky han khi chua luu', () => {
    expect(savingsMaturityDate(STK_001)).toBe('2027-04-15');
    expect(savingsMaturityDate(STK_002)).toBe('2027-02-02');
  });
  it('uu tien ngay da luu', () => {
    expect(savingsMaturityDate({ ...STK_001, MaturityDate: '2027-05-01' })).toBe('2027-05-01');
  });
  it('thieu du lieu thi null', () => {
    expect(savingsMaturityDate({ ...STK_001, OpenDate: null })).toBeNull();
  });
});

describe('savingsPledgeCapacity', () => {
  it('lanh lai cuoi ky = goc + lai den dao han', () => {
    expect(savingsPledgeCapacity(STK_001)).toBe(526000000);
    expect(savingsPledgeCapacity(STK_002)).toBe(307107945);
  });
  it('lanh lai dinh ky = goc - lai da chi', () => {
    expect(savingsPledgeCapacity({ ...STK_001, InterestPaymentMethod: 'periodic', PaidInterest: 10000000 })).toBe(490000000);
  });
  it('ngoai te = 90% goc quy doi, khong can lai suat', () => {
    const usd = book({ Id: 9, BookNumber: 'USD-1', DepositType: 'tg_foreign', Currency: 'USD', ExchangeRate: 25000, Amount: 10000 });
    expect(savingsPrincipalVnd(usd)).toBe(250000000);
    expect(savingsPledgeCapacity(usd)).toBe(225000000);
  });
  it('thieu lai suat, ngay gui hoac ky han thi null', () => {
    expect(savingsPledgeCapacity({ ...STK_001, InterestRate: null })).toBeNull();
    expect(savingsPledgeCapacity({ ...STK_001, OpenDate: null })).toBeNull();
    expect(savingsPledgeCapacity({ ...STK_001, Tenor: null })).toBeNull();
  });
});

describe('allocateObligations va savingsFreeCapacity', () => {
  const alloc = allocateObligations([CC_0418, CC_0907], LINKS, []);

  it('chia nghia vu theo ty le phan goc bao dam', () => {
    expect(alloc.get(2)).toEqual([
      { pledgeLoanId: 11, contractNumber: 'CC-2026-0907', principalCovered: 290000000, obligation: 297290520, dueDate: '2027-02-02' },
    ]);
    expect(savingsFreeCapacity(STK_002, alloc.get(2) ?? [])).toBe(9817425);
  });

  it('bat bien: con trong + tong nghia vu = kha nang bao dam', () => {
    for (const b of [STK_001, STK_002, STK_003]) {
      const rows = alloc.get(b.Id) ?? [];
      const used = rows.reduce((s, r) => s + r.obligation, 0);
      expect((savingsFreeCapacity(b, rows) ?? 0) + used).toBe(savingsPledgeCapacity(b));
    }
  });

  it('so chua cam co thi con trong bang kha nang bao dam', () => {
    expect(savingsFreeCapacity(STK_003, alloc.get(3) ?? [])).toBe(savingsPledgeCapacity(STK_003));
  });

  it('bo qua khoan vay da tat toan va lien ket da giai chap', () => {
    const closed = { ...CC_0418, IsClosed: true };
    const released = { ...link(103, 11, 3, 0), ReleasedDate: '2026-10-01' };
    const a = allocateObligations([closed, CC_0907], [...LINKS, released], []);
    expect(a.get(1)?.map((r) => r.pledgeLoanId)).toEqual([11]);
    expect(a.get(3)).toBeUndefined();
  });

  it('tinh tren du no sau tra truoc mot phan', () => {
    const l = loan({ Id: 20, ContractNumber: 'X', Amount: 400000000, InterestRate: 6.5, DisbursementDate: '2026-06-20', DueDate: '2027-02-15' });
    const reps = [repayment({ Id: 1, PledgeLoanId: 20, RepaymentDate: '2026-10-27', Kind: 'partial', PrincipalPaid: 100000000 })];
    const a = allocateObligations([l], [link(1, 20, 1, 400000000)], reps);
    // 300.000.000 × 6,5% × 111 ngày (27/10/2026 → 15/02/2027) / 365 = 5.930.137
    expect(a.get(1)?.[0].obligation).toBe(305930137);
  });

  it('so thieu thong tin thi con trong la null', () => {
    expect(savingsFreeCapacity({ ...STK_001, InterestRate: null }, alloc.get(1) ?? [])).toBeNull();
  });
});
