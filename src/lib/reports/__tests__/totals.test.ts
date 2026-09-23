import { describe, it, expect } from 'vitest';
import { buildKunnSheet, type KunnSheetRow } from '../builders/kunnSheet';
import { buildCreditSheet, type CreditSheetRow } from '../builders/creditSheet';
import { buildCollateralSheet, type CollateralSheetRow } from '../builders/collateralSheet';
import { buildPortfolioSheet } from '../builders/portfolioSheet';
import type { XlsxSheet } from '../../xlsxWriter';

const CTX = { todayIso: '2026-09-23' };

function dongCuoi(sheet: XlsxSheet) {
  return sheet.rows[sheet.rows.length - 1].map(c => c.value);
}

describe('Dong TONG CONG la hang cuoi, thang cot voi cot tien (AGENTS.md)', () => {
  it('KUNN: cong So tien nhan no va Du no', () => {
    const r = (loanAmount: number | null, outstanding: number | null): KunnSheetRow => ({
      cif: '1', customerName: 'A', kunnNumber: 'K', creditContractNumber: null, loanMethod: null,
      disbursementDate: null, kunnDueDate: null, loanAmount, outstanding, interestRate: 9,
      storedDebtGroup: 1, overdueSchedules: [],
    });
    const cuoi = dongCuoi(buildKunnSheet([r(100, 60), r(50, null)], 'all', CTX));
    expect(cuoi[0]).toBe('TỔNG CỘNG');
    expect(cuoi[10]).toBe(150);
    expect(cuoi[11]).toBe(60);
    expect(cuoi[12]).toBe('');
  });

  it('HDTD: cong Muc cap, Da su dung, Con kha dung', () => {
    const r = (g: number, u: number, a: number): CreditSheetRow => ({
      cif: '1', customerName: 'A', hdtdNumber: 'H', approvalCode: null, loanMethod: null,
      startDate: null, endDate: null, granted: g, used: u, available: a,
    });
    const cuoi = dongCuoi(buildCreditSheet([r(1000, 400, 600), r(500, 0, 500)], 'all', CTX));
    expect(cuoi[0]).toBe('TỔNG CỘNG');
    expect(cuoi.slice(10, 13)).toEqual([1500, 400, 1100]);
  });

  it('TSBD: cong Gia tri dinh gia va Han muc toi da, khong cong LTV', () => {
    const r = (v: number | null, m: number | null): CollateralSheetRow => ({
      cif: '1', customerName: 'A', assetCode: 'T', assetType: null, address: null,
      appraisalDate: null, tenorMonths: null, expiryDate: null,
      appraisedValue: v, ltvPercent: 80, maxLoan: m,
    });
    const cuoi = dongCuoi(buildCollateralSheet([r(1000, 800), r(null, null)], 'all', CTX));
    expect(cuoi[0]).toBe('TỔNG CỘNG');
    expect(cuoi[11]).toBe(1000);
    expect(cuoi[12]).toBe('');
    expect(cuoi[13]).toBe(800);
  });

  it('Danh muc: cong So tien nhan no va Du no, khong cong Tong muc cap lap lai theo HDTD', () => {
    const params = {
      customers: [{ Id: 1, CifKh: 'C', FullName: 'A', MaritalStatus: 'single' }],
      contracts: [
        { Id: 10, CustomerId: 1, ContractNumber: 'K1', ContractType: 1, LoanAmount: 100, CurrentBalance: 70, IsSettled: false },
        { Id: 11, CustomerId: 1, ContractNumber: 'K2', ContractType: 1, LoanAmount: 50, CurrentBalance: 20, IsSettled: false },
      ],
      creditContracts: [], collaterals: [],
    } as any;
    const cuoi = dongCuoi(buildPortfolioSheet(params, CTX));
    expect(cuoi[0]).toBe('TỔNG CỘNG');
    expect(cuoi[6]).toBe('');
    expect(cuoi[7]).toBe(150);
    expect(cuoi[8]).toBe(90);
  });

  it('Bang rong van co dong TONG CONG bang 0 ngay sau tieu de', () => {
    const sheet = buildCreditSheet([], 'all', CTX);
    expect(sheet.rows).toHaveLength(2);
    expect(dongCuoi(sheet)[0]).toBe('TỔNG CỘNG');
    expect(dongCuoi(sheet)[10]).toBe(0);
  });

  it('Ngay khong xac dinh thi o trang thai de trong o ca bon builder co loc', () => {
    const k = buildKunnSheet([{
      cif: '1', customerName: 'A', kunnNumber: 'K', creditContractNumber: null, loanMethod: null,
      disbursementDate: null, kunnDueDate: null, loanAmount: 1, outstanding: 1, interestRate: 1,
      overdueSchedules: [],
    }], 'all', CTX);
    expect(k.rows[1][9].value).toBe('');
  });
});
