import { describe, expect, it } from 'vitest';
import type { CreditContract, LoanContract } from '../../types';
import { hdtdStatusLabel, summarizeCreditContracts, totalsOfCreditContracts } from '../creditContract';
import { renewalCandidates } from '../hdtdRenewal';

const TODAY = '2026-11-11';

const hdtd = (over: Partial<CreditContract>): CreditContract => ({
  Id: 23, CustomerId: 1, HdtdNumber: 'HDTD-CU', LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 2_450_000_000, ContractStartDate: '2025-07-08', ContractEndDate: '2026-07-08', IsClosed: false, ...over,
} as CreditContract);

const kunn = (over: Partial<LoanContract>): LoanContract => ({
  Id: 1, CustomerId: 1, CreditContractId: 23, ContractNumber: 'GNN-1', ContractType: 0,
  LoanMethod: 'Hạn mức tín dụng', LoanAmount: 500_000_000, CurrentBalance: 500_000_000, IsSettled: false, ...over,
} as LoanContract);

const oldHdtd = hdtd({});
const newHdtd = hdtd({ Id: 73, HdtdNumber: 'HDTD-MOI', ContractAmount: 2_400_000_000,
  ContractStartDate: '2026-08-22', ContractEndDate: '2027-08-22' });
const kunns = [
  kunn({}),
  kunn({ Id: 2, ContractNumber: 'GNN-2', CurrentBalance: 300_000_000, LoanAmount: 300_000_000 }),
  kunn({ Id: 3, CreditContractId: 73, ContractNumber: 'GNN-MOI-1', CurrentBalance: 400_000_000, LoanAmount: 400_000_000 }),
];
const totals = (contracts: CreditContract[]) =>
  totalsOfCreditContracts(summarizeCreditContracts(contracts, kunns, { today: TODAY }));

describe('HĐTD tái tục không cộng dồn hạn mức cấp', () => {
  it('chưa ghi tái tục: HĐTD cũ hết hiệu lực còn KUNN dư nợ vẫn bị cộng với HĐTD mới', () => {
    expect(totals([oldHdtd, newHdtd]).granted).toBe(4_850_000_000);
  });

  it('ghi HĐTD mới tái tục HĐTD cũ: chỉ cộng hạn mức mới; dư nợ cũ giữ riêng, không trừ vào hạn mức mới', () => {
    const renewing = { ...newHdtd, RenewsCreditContractId: 23 };
    const t = totals([oldHdtd, renewing]);
    expect(t.granted).toBe(2_400_000_000);
    expect(t.outstanding).toBe(1_200_000_000);
    expect(t.available).toBe(2_000_000_000);
    const [oldSummary, newSummary] = summarizeCreditContracts([oldHdtd, renewing], kunns, { today: TODAY });
    expect(oldSummary.renewedBy?.Id).toBe(73);
    expect(oldSummary.outstanding).toBe(800_000_000);
    expect(newSummary.renewedBy).toBeNull();
  });

  it('HĐTD tái tục đã đóng thì không còn thay HĐTD cũ', () => {
    const renewing = { ...newHdtd, RenewsCreditContractId: 23, IsClosed: true };
    const [oldSummary] = summarizeCreditContracts([oldHdtd, renewing], kunns, { today: TODAY });
    expect(oldSummary.renewedBy).toBeNull();
  });

  it('nhãn trạng thái HĐTD đã tái tục', () => {
    expect(hdtdStatusLabel('expired', 2, true)).toBe('ĐÃ TÁI TỤC · CÒN DƯ NỢ');
    expect(hdtdStatusLabel('expired', 0, true)).toBe('ĐÃ TÁI TỤC');
    expect(hdtdStatusLabel('expired', 2)).toBe('HẾT HIỆU LỰC · CÒN DƯ NỢ');
  });
});

describe('renewalCandidates', () => {
  const a = hdtd({ Id: 1, HdtdNumber: 'A', ContractEndDate: '2025-01-01' });
  const b = hdtd({ Id: 2, HdtdNumber: 'B', ContractEndDate: '2026-07-08' });
  const c = hdtd({ Id: 3, HdtdNumber: 'C', IsClosed: true });
  const d = hdtd({ Id: 4, HdtdNumber: 'D', RenewsCreditContractId: 1, ContractEndDate: '2027-01-01' });

  it('HĐTD mới: liệt kê HĐTD khác chưa đóng, chưa bị HĐTD khác tái tục, hết hạn gần nhất lên đầu', () => {
    expect(renewalCandidates([a, b, c, d], null).map(x => x.HdtdNumber)).toEqual(['D', 'B']);
  });

  it('sửa HĐTD đang tái tục A: vẫn thấy A, không thấy chính nó', () => {
    expect(renewalCandidates([a, b, c, d], 4).map(x => x.HdtdNumber)).toEqual(['B', 'A']);
  });

  it('không cho chọn HĐTD đang tái tục chính HĐTD đang sửa (tránh vòng lặp)', () => {
    expect(renewalCandidates([a, b, d], 1).map(x => x.HdtdNumber)).toEqual(['B']);
  });
});
