import { describe, expect, it } from 'vitest';
import type { CreditContract, LoanContract } from '../../types';
import { hdtdStatusLabel, summarizeCreditContracts, totalsOfCreditContracts } from '../creditContract';
import { hdtdListState, renewalCandidates, renewalError } from '../hdtdRenewal';

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

describe('renewalCandidates — chỉ tái tục từ HĐTD cũ hơn', () => {
  const a = hdtd({ Id: 1, HdtdNumber: 'A', ContractStartDate: '2024-01-01', ContractEndDate: '2025-01-01', IsClosed: true });
  const b = hdtd({ Id: 2, HdtdNumber: 'B', ContractStartDate: '2025-07-08', ContractEndDate: '2026-07-08' });
  const d = hdtd({ Id: 4, HdtdNumber: 'D', ContractStartDate: '2025-02-01', ContractEndDate: '2026-02-01', RenewsCreditContractId: 1 });
  const n = hdtd({ Id: 5, HdtdNumber: 'N', ContractStartDate: '2026-08-22', ContractEndDate: '2027-08-22' });
  const all = [a, b, d, n];

  it('HĐTD mới bắt đầu 22/08/2026: thấy các HĐTD bắt đầu trước, kể cả đã tất toán; mới gần nhất lên đầu; bỏ HĐTD đã bị tái tục', () => {
    expect(renewalCandidates(all, null, '2026-08-22').map(x => x.HdtdNumber)).toEqual(['B', 'D']);
  });

  it('sửa HĐTD cũ B: không chọn được HĐTD mới N (tái tục ngược)', () => {
    expect(renewalCandidates(all, 2, '2025-07-08').map(x => x.HdtdNumber)).not.toContain('N');
  });

  it('sửa HĐTD D đang tái tục A: vẫn thấy A dù A đã tất toán', () => {
    expect(renewalCandidates(all, 4, '2025-02-01').map(x => x.HdtdNumber)).toEqual(['A']);
  });

  it('chưa có ngày hiệu lực thì chưa có lựa chọn', () => {
    expect(renewalCandidates(all, null, '')).toEqual([]);
  });

  it('lưu: chặn chọn HĐTD mới hơn, chặn khi thiếu ngày, cho qua khi hợp lệ hoặc không tái tục', () => {
    expect(renewalError(all, 2, '2025-07-08', 5)).toBe('HĐTD được tái tục phải bắt đầu trước HĐTD này và chưa được HĐTD khác tái tục.');
    expect(renewalError(all, null, '', 2)).toBe('Nhập ngày hiệu lực của HĐTD trước khi chọn HĐTD được tái tục.');
    expect(renewalError(all, 5, '2026-08-22', 2)).toBeNull();
    expect(renewalError(all, 5, '2026-08-22', null)).toBeNull();
  });
});

describe('hdtdListState — tách đã tái tục và đã tất toán', () => {
  it('đã đóng là đã tất toán (kể cả khi có HĐTD tái tục); chưa đóng mà có HĐTD tái tục là đã tái tục; còn lại đang dùng', () => {
    const renewer = hdtd({ Id: 9 });
    expect(hdtdListState({ contract: { IsClosed: true }, renewedBy: renewer })).toBe('settled');
    expect(hdtdListState({ contract: { IsClosed: false }, renewedBy: renewer })).toBe('renewed');
    expect(hdtdListState({ contract: { IsClosed: false }, renewedBy: null })).toBe('open');
  });
});
