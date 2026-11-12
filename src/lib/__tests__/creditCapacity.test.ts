import { describe, expect, it } from 'vitest';
import type { Collateral, CreditContract, LoanContract } from '../../types';
import { summarizeCreditContracts } from '../creditContract';
import { customerCreditCapacity, hdtdCapacityUse } from '../creditCapacity';

const TODAY = '2026-11-12';
const tsbd = { Id: 47, CustomerId: 9, AssetType: 'Loại 2', AppraisedValue: 619_000_000, LtvPercent: 70,
  AppraisalDate: '2025-07-15', AppraisalTenorMonths: 24 } as Collateral;
const tungLan = { Id: 50, CustomerId: 9, HdtdNumber: 'PNAT.CN.04210624', LoanMethod: 'Cho vay từng lần',
  ContractAmount: 420_000_000, ContractStartDate: '2024-06-24', ContractEndDate: '2032-06-24', IsClosed: false, CollateralIds: '47' } as CreditContract;
const gnn = { Id: 1059, CustomerId: 9, CreditContractId: 50, ContractNumber: 'PNAT.CN.04210624/GNN-01', ContractType: 1,
  LoanMethod: 'Cho vay từng lần', LoanAmount: 420_000_000, CurrentBalance: 297_495_000, IsSettled: false } as LoanContract;
const hanMuc = (over: Partial<CreditContract>) => ({ Id: 60, CustomerId: 9, HdtdNumber: 'HM', LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 100_000_000, ContractStartDate: '2026-01-01', ContractEndDate: '2027-01-01', IsClosed: false, ...over }) as CreditContract;
const securing = () => 'securing' as const;
const sum = (ccs: CreditContract[], kunns: LoanContract[]) => summarizeCreditContracts(ccs, kunns, { today: TODAY });

describe('khả năng bảo đảm còn trống để cấp HĐTD mới', () => {
  it('vay từng lần chỉ chiếm dư nợ: TSBĐ 619tr × 70% = 433,3tr, dư nợ 297,495tr → còn cấp được 135,805tr', () => {
    const cap = customerCreditCapacity(sum([tungLan], [gnn]), [tsbd], securing, TODAY);
    expect(cap).toEqual({ capacity: 433_300_000, used: 297_495_000, remaining: 135_805_000 });
  });

  it('vay từng lần chưa giải ngân hết thì phần chưa giải ngân vẫn bị giữ', () => {
    const [s] = sum([tungLan], [{ ...gnn, LoanAmount: 300_000_000, CurrentBalance: 300_000_000 }]);
    expect(hdtdCapacityUse(s)).toBe(420_000_000);
  });

  it('hạn mức quay vòng còn hiệu lực giữ trọn mức cấp dù dư nợ 0; hết hiệu lực hoặc đã tái tục chỉ giữ dư nợ; đã tất toán không giữ', () => {
    const k = { ...gnn, Id: 2, CreditContractId: 60, LoanMethod: 'Hạn mức tín dụng', LoanAmount: 30_000_000, CurrentBalance: 30_000_000 };
    expect(hdtdCapacityUse(sum([hanMuc({})], [])[0])).toBe(100_000_000);
    expect(hdtdCapacityUse(sum([hanMuc({ ContractEndDate: '2026-06-01' })], [k])[0])).toBe(30_000_000);
    const [old] = sum([hanMuc({}), hanMuc({ Id: 61, RenewsCreditContractId: 60 })], [k]);
    expect(hdtdCapacityUse(old)).toBe(30_000_000);
    expect(hdtdCapacityUse(sum([hanMuc({ IsClosed: true })], [])[0])).toBe(0);
  });

  it('tài sản đã giải chấp trả khách không còn tính vào khả năng bảo đảm; vượt thì còn 0', () => {
    expect(customerCreditCapacity(sum([tungLan], [gnn]), [tsbd], () => 'released', TODAY))
      .toEqual({ capacity: 0, used: 297_495_000, remaining: 0 });
  });
});
