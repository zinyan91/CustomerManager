import { describe, it, expect } from 'vitest';
import { mapKunnRows, mapDueRows, mapCreditRows, mapCollateralRows } from '../mappers';
import type { Collateral, CreditContract, Customer, LoanContract, RepaymentSchedule } from '../../../types';

const HOM_NAY = '2026-09-23';

const KH: Customer = { Id: 1, CifKh: 'CIF001', FullName: 'LE VAN C', MaritalStatus: 'single' };

function kunn(over: Partial<LoanContract> = {}): LoanContract {
  return {
    Id: 10, CustomerId: 1, ContractNumber: 'KUNN-01', ContractType: 1,
    LoanAmount: 100_000_000, CurrentBalance: 60_000_000, IsSettled: false,
    KunnDueDate: '2026-09-25',
    ...over,
  };
}

function ky(over: Partial<RepaymentSchedule> = {}): RepaymentSchedule {
  return {
    Id: 100, ContractId: 10, PeriodNumber: 1, DueDate: '2026-09-25',
    PrincipalAmount: 5_000_000, InterestAmount: 500_000, TotalAmount: 5_500_000,
    IsPaid: false,
    ...over,
  };
}

describe('mapKunnRows', () => {
  it('bo khoan da tat toan', () => {
    const rows = mapKunnRows([KH], [kunn(), kunn({ Id: 11, ContractNumber: 'TT', IsSettled: true })], [], {});
    expect(rows.map(r => r.kunnNumber)).toEqual(['KUNN-01']);
  });

  it('du no lay theo goc da thu khi co, khong doc thang CurrentBalance', () => {
    const rows = mapKunnRows([KH], [kunn()], [], { 10: 30_000_000 });
    expect(rows[0].outstanding).toBe(70_000_000);
  });

  it('khong co goc da thu thi dung CurrentBalance', () => {
    const rows = mapKunnRows([KH], [kunn()], [], {});
    expect(rows[0].outstanding).toBe(60_000_000);
  });

  it('gan dung lich qua han cua tung khoan de tinh nhom no song', () => {
    const rows = mapKunnRows([KH], [kunn()], [ky(), ky({ Id: 101, ContractId: 99 })], {});
    expect(rows[0].overdueSchedules.map(s => s.Id)).toEqual([100]);
  });

  it('khach hang khong tim thay thi CIF va ten de trong, khong nem loi', () => {
    const rows = mapKunnRows([], [kunn()], [], {});
    expect(rows[0].cif).toBe('');
    expect(rows[0].customerName).toBe('');
  });
});

describe('mapDueRows', () => {
  it('moi ky chua tra thanh mot dong, dung gia tri tien cua ky', () => {
    const rows = mapDueRows([KH], [kunn()], [ky(), ky({ Id: 101, PeriodNumber: 2, DueDate: '2026-10-25' })], {});
    expect(rows).toHaveLength(2);
    expect(rows[0].principal).toBe(5_000_000);
    expect(rows[0].interest).toBe(500_000);
    expect(rows[0].total).toBe(5_500_000);
  });

  it('ky da tra du bi bo qua', () => {
    const rows = mapDueRows([KH], [kunn()], [ky({ IsPaid: true })], {});
    expect(rows).toHaveLength(0);
  });

  it('ky thuoc khoan da tat toan bi bo qua', () => {
    const rows = mapDueRows([KH], [kunn({ IsSettled: true })], [ky()], {});
    expect(rows).toHaveLength(0);
  });
});

describe('mapCreditRows', () => {
  const HD: CreditContract = {
    Id: 5, CustomerId: 1, HdtdNumber: 'HDTD-01', ApprovalCode: 'PD-01',
    LoanMethod: 'Hạn mức', ContractAmount: 500_000_000,
    ContractStartDate: '2026-01-01', ContractEndDate: '2026-12-31',
  };

  it('bo hop dong da dong', () => {
    const rows = mapCreditRows([KH], [HD, { ...HD, Id: 6, HdtdNumber: 'DONG', IsClosed: true }], [], {}, HOM_NAY);
    expect(rows.map(r => r.hdtdNumber)).toEqual(['HDTD-01']);
  });

  it('muc cap lay tu ContractAmount, hop dong chua co KUNN thi kha dung bang muc cap', () => {
    const rows = mapCreditRows([KH], [HD], [], {}, HOM_NAY);
    expect(rows[0].granted).toBe(500_000_000);
    expect(rows[0].used).toBe(0);
    expect(rows[0].available).toBe(500_000_000);
  });
});

describe('mapCollateralRows', () => {
  const TS: Collateral = {
    Id: 7, CustomerId: 1, AssetCode: 'TS-01', AssetType: 'BĐS Loại 1',
    Address: '1 Le Loi', AppraisedValue: 1_000_000_000, LtvPercent: 80,
    AppraisalDate: '2025-10-01', AppraisalTenorMonths: 12,
  };

  it('han muc toi da = gia tri dinh gia nhan LTV hieu luc', () => {
    const rows = mapCollateralRows([KH], [TS]);
    expect(rows[0].maxLoan).toBe(800_000_000);
  });

  it('ngay het hieu luc tinh tu ngay dinh gia cong hieu luc thang', () => {
    const rows = mapCollateralRows([KH], [TS]);
    expect(rows[0].expiryDate).toBe('2026-10-01');
  });

  it('tai san han che nhan co LTV 0 thi han muc toi da la 0, khong roi ve muc mac dinh', () => {
    const rows = mapCollateralRows([KH], [{ ...TS, AssetType: 'Hạn chế nhận TS', LtvPercent: 0 }]);
    expect(rows[0].ltvPercent).toBe(0);
    expect(rows[0].maxLoan).toBe(0);
  });

  it('chua co ngay dinh gia thi ngay het hieu luc la null', () => {
    const rows = mapCollateralRows([KH], [{ ...TS, AppraisalDate: null }]);
    expect(rows[0].expiryDate).toBeNull();
  });
});
