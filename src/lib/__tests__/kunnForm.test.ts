import { describe, it, expect } from 'vitest';
import { blankFormFields, buildKunnPayload, checkLoanAmount } from '../kunnForm';
import type { CreditContract } from '../../types';

const hdtdCha: CreditContract[] = [
  {
    Id: 7,
    CustomerId: 6,
    HdtdNumber: '2002/HDTD/9653222',
    ContractStartDate: '2025-07-24',
    ContractEndDate: '2026-07-24',
  } as CreditContract,
];

const dungPayload = (over: {
  CreditContractId?: number | null;
  ContractStartDate?: string;
  ContractEndDate?: string;
}, creditContracts: CreditContract[] = hdtdCha) => {
  const fields = blankFormFields(6);
  fields.contract.CreditContractId = over.CreditContractId ?? null;
  fields.contract.ContractStartDate = over.ContractStartDate ?? '';
  fields.contract.ContractEndDate = over.ContractEndDate ?? '';

  return buildKunnPayload({
    fields,
    customerId: 6,
    contractNumber: '2002/HDTD/9653222/GNN-01',
    prefPercent: 8.5,
    basePercent: 0,
    marginPercent: 0,
    activeRatePercent: 8.5,
    creditContracts,
  });
};

describe('buildKunnPayload — ngày hiệu lực HĐTD', () => {
  it('lấy ngày từ HĐTD cha, không lấy số form tự tính', () => {
    const p = dungPayload({
      CreditContractId: 7,
      ContractStartDate: '2025-07-24',
      ContractEndDate: '2026-07-25',
    });

    expect(p.ContractStartDate).toBe('2025-07-24');
    expect(p.ContractEndDate).toBe('2026-07-24');
  });

  it('form để trống vẫn lấy được ngày của cha', () => {
    const p = dungPayload({ CreditContractId: 7 });
    expect(p.ContractEndDate).toBe('2026-07-24');
  });

  it('không tra ra HĐTD cha thì giữ nguyên số trên form, không xoá trắng', () => {
    const p = dungPayload({
      CreditContractId: 999,
      ContractStartDate: '2025-01-01',
      ContractEndDate: '2026-01-01',
    });

    expect(p.ContractStartDate).toBe('2025-01-01');
    expect(p.ContractEndDate).toBe('2026-01-01');
  });

  it('chưa gắn HĐTD cha thì cũng giữ nguyên số trên form', () => {
    const p = dungPayload({
      CreditContractId: null,
      ContractStartDate: '2025-03-05',
      ContractEndDate: '2026-03-05',
    });

    expect(p.ContractEndDate).toBe('2026-03-05');
  });

  it('không còn ghi cột HdtdDueDate đã chết', () => {
    const p = dungPayload({ CreditContractId: 7 });
    expect('HdtdDueDate' in p).toBe(false);
  });
});

describe('checkLoanAmount — số tiền vay KUNN', () => {
  it('bỏ trống thì chặn', () => {
    const r = checkLoanAmount(0);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Số tiền vay');
  });

  it('số âm thì chặn', () => {
    expect(checkLoanAmount(-1_000_000).ok).toBe(false);
  });

  it('không phải số thì chặn', () => {
    expect(checkLoanAmount(NaN).ok).toBe(false);
  });

  it('số dương thì cho qua', () => {
    expect(checkLoanAmount(100_000_000).ok).toBe(true);
    expect(checkLoanAmount(1).ok).toBe(true);
  });
});
