import { describe, it, expect } from 'vitest';
import { loanMethodOfKunn, loanYearAt, suggestSettlementFee } from '../settlementFee';
import type { CreditContract, LoanContract } from '../../types';

const kunn = (o: Partial<LoanContract>): LoanContract => ({ Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 1, ...o } as LoanContract);

describe('loanMethodOfKunn', () => {
  it('ưu tiên hình thức của HĐTD liên kết, rồi của KUNN, rồi suy từ loại hợp đồng', () => {
    const ccs = [{ Id: 9, LoanMethod: 'Hạn mức tín dụng' } as CreditContract];
    expect(loanMethodOfKunn(kunn({ CreditContractId: 9, LoanMethod: 'Cho vay từng lần' }), ccs)).toBe('Hạn mức tín dụng');
    expect(loanMethodOfKunn(kunn({ LoanMethod: 'Cho vay từng lần' }), ccs)).toBe('Cho vay từng lần');
    expect(loanMethodOfKunn(kunn({ ContractType: 0 }), [])).toBe('Hạn mức tín dụng');
    expect(loanMethodOfKunn(kunn({ ContractType: 1 }), [])).toBe('Cho vay từng lần');
  });
});

describe('loanYearAt', () => {
  it('năm thứ mấy tính từ ngày giải ngân, tròn năm thì sang năm sau', () => {
    expect(loanYearAt('2024-03-15', '2024-03-15')).toBe(1);
    expect(loanYearAt('2024-03-15', '2025-03-14')).toBe(1);
    expect(loanYearAt('2024-03-15', '2025-03-15')).toBe(2);
    expect(loanYearAt('2020-01-10', '2026-01-09')).toBe(6);
    expect(loanYearAt('2020-01-10', '2026-01-10')).toBe(7);
  });

  it('thiếu ngày giải ngân hoặc tất toán trước ngày giải ngân thì không xác định', () => {
    expect(loanYearAt(null, '2026-01-01')).toBeNull();
    expect(loanYearAt('2026-05-01', '2026-04-30')).toBeNull();
  });
});

describe('suggestSettlementFee', () => {
  it('hạn mức tín dụng: miễn phí, kể cả năm đầu', () => {
    expect(suggestSettlementFee({ loanMethod: 'Hạn mức tín dụng', disbursementDate: '2026-10-01', settlementDate: '2026-11-10' }))
      .toEqual({ percent: 0, revolving: true, loanYear: 1, reason: 'Miễn phí (hạn mức)' });
  });

  it('vay từng lần: theo biểu năm 1–5, từ năm 6 miễn phí', () => {
    const at = (settlementDate: string) => suggestSettlementFee({ loanMethod: 'Cho vay từng lần', disbursementDate: '2021-06-01', settlementDate });
    expect(at('2021-12-01')).toMatchObject({ percent: 4, loanYear: 1, reason: 'Năm thứ 1: 4%' });
    expect(at('2023-06-01')).toMatchObject({ percent: 2, loanYear: 3 });
    expect(at('2026-05-31')).toMatchObject({ percent: 0.5, loanYear: 5 });
    expect(at('2026-06-01')).toMatchObject({ percent: 0, loanYear: 6, reason: 'Từ năm thứ 6: miễn phí' });
  });

  it('hạn mức từng lần không phải hạn mức quay vòng nên vẫn tính phí theo biểu', () => {
    expect(suggestSettlementFee({ loanMethod: 'Hạn mức tín dụng từng lần', disbursementDate: '2026-01-01', settlementDate: '2026-11-10' }).percent).toBe(4);
  });

  it('không xác định được năm vay thì để 0% và nói rõ cần nhập tay', () => {
    expect(suggestSettlementFee({ loanMethod: 'Cho vay từng lần', disbursementDate: null, settlementDate: '2026-11-10' }))
      .toMatchObject({ percent: 0, loanYear: null, reason: 'Thiếu ngày giải ngân, nhập tay' });
  });
});
