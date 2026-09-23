import { describe, it, expect } from 'vitest';
import { buildPortfolioSheet } from '../builders/portfolioSheet';

const CTX = { todayIso: '2026-09-23' };

const RONG = { customers: [], contracts: [], creditContracts: [], collaterals: [] } as any;

describe('buildPortfolioSheet', () => {
  it('tra ve mot sheet co ten va hang tieu de', () => {
    const sheet = buildPortfolioSheet(RONG, CTX);
    expect(sheet.name).toBeTruthy();
    expect(sheet.rows.length).toBeGreaterThan(0);
  });

  it('danh muc rong khong nem loi', () => {
    expect(() => buildPortfolioSheet(RONG, CTX)).not.toThrow();
  });
});

describe('buildPortfolioSheet — anh xa dung truong du lieu that', () => {
  it('mot KUNN dang luu no ra dung mot dong voi dung CIF, ten, so KUNN va du no', () => {
    const params = {
      customers: [{ Id: 1, CifKh: 'CIF001', FullName: 'TRAN THI B', MaritalStatus: 'single' }],
      contracts: [{
        Id: 10, CustomerId: 1, ContractNumber: 'KUNN-777', ContractType: 1,
        LoanMethod: 'Từng lần', LoanAmount: 500_000_000, CurrentBalance: 320_000_000,
        IsSettled: false,
      }],
      creditContracts: [],
      collaterals: [],
    } as any;

    const sheet = buildPortfolioSheet(params, CTX);

    expect(sheet.rows).toHaveLength(3);
    const dong = sheet.rows[1].map(c => c.value);
    expect(dong[1]).toBe('CIF001');
    expect(dong[2]).toBe('TRAN THI B');
    expect(dong[3]).toBe('Từng lần');
    expect(dong[4]).toBe('KUNN-777');
    expect(dong[8]).toBe(320_000_000);
  });

  it('KUNN da tat toan khong xuat hien', () => {
    const params = {
      customers: [{ Id: 1, CifKh: 'CIF001', FullName: 'TRAN THI B', MaritalStatus: 'single' }],
      contracts: [{ Id: 10, CustomerId: 1, ContractNumber: 'KUNN-TT', ContractType: 1, IsSettled: true, CurrentBalance: 0 }],
      creditContracts: [],
      collaterals: [],
    } as any;

    expect(buildPortfolioSheet(params, CTX).rows).toHaveLength(2);
  });
});
