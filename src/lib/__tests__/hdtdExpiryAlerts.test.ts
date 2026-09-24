import { describe, it, expect } from 'vitest';
import { buildHdtdExpiryList, findRenewingHdtd } from '../hdtdExpiryAlerts';
import type { CreditContract, LoanContract } from '../../types';

const TODAY = '2026-09-24';

function hdtd(p: Partial<CreditContract> & Pick<CreditContract, 'Id' | 'CustomerId' | 'HdtdNumber'>): CreditContract {
  return { LoanMethod: 'Hạn mức tín dụng', IsClosed: false, ...p };
}

function kunn(p: Partial<LoanContract> & Pick<LoanContract, 'Id' | 'CustomerId' | 'ContractNumber'>): LoanContract {
  return { LoanMethod: 'Hạn mức tín dụng', IsSettled: false, ...p } as LoanContract;
}

const OLD = hdtd({ Id: 1, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222',
  ContractStartDate: '2025-03-01', ContractEndDate: '2026-03-01' });
const NEW = hdtd({ Id: 2, CustomerId: 7, HdtdNumber: '2002/HDTD/9800001',
  ContractStartDate: '2026-03-05', ContractEndDate: '2027-03-05' });
const OLD_KUNN = kunn({ Id: 10, CustomerId: 7, CreditContractId: 1,
  ContractNumber: '2002/HDTD/9653222/GNN-03', ContractAmount: 1_400_000_000,
  ContractEndDate: '2026-03-01', KunnDueDate: '2026-11-20' });

describe('findRenewingHdtd', () => {
  it('HĐTD mới của cùng khách, đã hiệu lực, còn hạn, bắt đầu sau HĐTD cũ là HĐTD tái cấp', () => {
    expect(findRenewingHdtd(OLD, [OLD, NEW], TODAY)?.Id).toBe(2);
  });

  it('HĐTD của khách khác không tính', () => {
    expect(findRenewingHdtd(OLD, [OLD, { ...NEW, CustomerId: 8 }], TODAY)).toBeUndefined();
  });

  it('HĐTD mới chưa tới ngày hiệu lực chưa tính là tái cấp', () => {
    expect(findRenewingHdtd(OLD, [OLD, { ...NEW, ContractStartDate: '2026-10-01' }], TODAY)).toBeUndefined();
  });

  it('HĐTD mới đã đóng hoặc đã hết hạn không tính', () => {
    expect(findRenewingHdtd(OLD, [OLD, { ...NEW, IsClosed: true }], TODAY)).toBeUndefined();
    expect(findRenewingHdtd(OLD, [OLD, { ...NEW, ContractEndDate: '2026-09-01' }], TODAY)).toBeUndefined();
  });

  it('HĐTD song song bắt đầu trước HĐTD cũ không tính là tái cấp', () => {
    expect(findRenewingHdtd(OLD, [OLD, { ...NEW, ContractStartDate: '2025-01-01' }], TODAY)).toBeUndefined();
  });
});

describe('buildHdtdExpiryList', () => {
  it('HĐTD cũ hết hạn nhưng đã có HĐTD mới thì không hiện', () => {
    expect(buildHdtdExpiryList([OLD_KUNN], [OLD, NEW], TODAY)).toEqual([]);
  });

  it('HĐTD cũ hết hạn chưa tái cấp vẫn hiện để nhắc, ngày hết hạn lấy từ HĐTD', () => {
    const list = buildHdtdExpiryList([OLD_KUNN], [OLD], TODAY);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ masterNo: '2002/HDTD/9653222', endDateStr: '2026-03-01', hdtdId: 1 });
    expect(list[0].daysLeft).toBeLessThan(0);
  });

  it('ngày hết hạn của HĐTD thắng bản sao cũ trên KUNN', () => {
    const extended = { ...OLD, ContractEndDate: '2026-10-10' };
    const list = buildHdtdExpiryList([OLD_KUNN], [extended], TODAY);
    expect(list[0].endDateStr).toBe('2026-10-10');
    expect(list[0].daysLeft).toBe(16);
  });

  it('còn hơn 45 ngày thì không hiện', () => {
    expect(buildHdtdExpiryList([OLD_KUNN], [{ ...OLD, ContractEndDate: '2027-01-01' }], TODAY)).toEqual([]);
  });

  it('KUNN không phải hạn mức thì bỏ qua', () => {
    expect(buildHdtdExpiryList([{ ...OLD_KUNN, LoanMethod: 'Cho vay từng lần' }], [OLD], TODAY)).toEqual([]);
  });

  it('nhiều KUNN cùng một HĐTD chỉ ra một dòng', () => {
    const k2 = { ...OLD_KUNN, Id: 11, ContractNumber: '2002/HDTD/9653222/GNN-04', ContractAmount: 1_400_000_000 };
    expect(buildHdtdExpiryList([OLD_KUNN, k2], [OLD], TODAY)).toHaveLength(1);
  });

  it('mất khóa liên kết thì tra theo số HĐTD, và chỉ trong cùng khách hàng', () => {
    const noFk = { ...OLD_KUNN, CreditContractId: undefined };
    const otherCustomerSameNumber = { ...OLD, Id: 99, CustomerId: 8, ContractEndDate: '2026-09-30' };
    const list = buildHdtdExpiryList([noFk], [otherCustomerSameNumber, OLD], TODAY);
    expect(list).toHaveLength(1);
    expect(list[0].hdtdId).toBe(1);
    expect(list[0].endDateStr).toBe('2026-03-01');
  });

  it('cùng số HĐTD ở hai khách hàng thì ra hai dòng với khóa khác nhau', () => {
    const otherHdtd = { ...OLD, Id: 99, CustomerId: 8 };
    const otherKunn = { ...OLD_KUNN, Id: 20, CustomerId: 8, CreditContractId: 99 };
    const list = buildHdtdExpiryList([OLD_KUNN, otherKunn], [OLD, otherHdtd], TODAY);
    expect(list).toHaveLength(2);
    expect(new Set(list.map(r => r.key)).size).toBe(2);
  });

  it('không tìm được HĐTD thì dùng ngày chép trên KUNN', () => {
    const list = buildHdtdExpiryList([{ ...OLD_KUNN, CreditContractId: undefined }], [], TODAY);
    expect(list[0]).toMatchObject({ endDateStr: '2026-03-01', hdtdId: null });
  });
});
