import { describe, it, expect } from 'vitest';
import type { Customer, LoanContract, CreditContract, Collateral } from '../../types';
import {
  isKunnActiveDebt,
  buildActivePortfolioData,
  formatAppraisalDaysRemaining,
  generateCustomerPortfolioWorkbook,
} from '../customerPortfolioExport';

const mockCustomers: Customer[] = [
  {
    Id: 1,
    CifKh: 'CIF001',
    CifKhlq: 'CIFLQ001',
    FullName: 'Nguyễn Văn A',
    SpouseName: 'Trần Thị B',
    MaritalStatus: 'Đã kết hôn',
  },
  {
    Id: 2,
    CifKh: 'CIF002',
    FullName: 'Lê Văn C (Đã tất toán hết)',
    MaritalStatus: 'Độc thân',
  },
];

const mockCreditContracts: CreditContract[] = [
  {
    Id: 10,
    CustomerId: 1,
    HdtdNumber: '2026/HĐTD/001',
    ContractAmount: 500_000_000,
    ContractStartDate: '2026-01-01',
    ContractEndDate: '2027-01-01',
    LoanTenorMonths: 12,
    CollateralIds: '101',
  },
];

const mockContracts: LoanContract[] = [
  {
    Id: 101,
    CustomerId: 1,
    CreditContractId: 10,
    ContractNumber: 'KUNN-01',
    ContractType: 0,
    LoanMethod: 'Hạn mức tín dụng',
    LoanAmount: 200_000_000,
    CurrentBalance: 150_000_000,
    InterestRate: 0.10,
    DisbursementDate: '2026-02-01',
    KunnTenor: '6 tháng',
    KunnDueDate: '2026-08-01',
    IsSettled: false,
  },
  {
    Id: 102,
    CustomerId: 2,
    ContractNumber: 'KUNN-02-SETTLED',
    ContractType: 1,
    LoanAmount: 100_000_000,
    CurrentBalance: 0,
    IsSettled: true,
  },
];

const mockCollaterals: Collateral[] = [
  {
    Id: 101,
    CustomerId: 1,
    AssetCode: 'TS-BDS-01',
    Address: '123 Đường Nguyễn Trãi, Hà Nội',
    AppraisedValue: 800_000_000,
    AssetType: 'BĐS - Loại 1',
    AppraisalDate: '2026-01-15',
    AppraisalTenorMonths: 12,
  },
];

describe('customerPortfolioExport', () => {
  describe('isKunnActiveDebt', () => {
    it('nhận diện đúng KUNN đang lưu nợ và KUNN đã tất toán', () => {
      expect(isKunnActiveDebt(mockContracts[0])).toBe(true);
      expect(isKunnActiveDebt(mockContracts[1])).toBe(false);
      expect(isKunnActiveDebt({ ...mockContracts[0], CurrentBalance: 0 })).toBe(false);
    });
  });

  describe('buildActivePortfolioData', () => {
    it('loại trừ 100% khách hàng đã tất toán và khớp nối thông tin chính xác', () => {
      const data = buildActivePortfolioData({
        customers: mockCustomers,
        contracts: mockContracts,
        creditContracts: mockCreditContracts,
        collaterals: mockCollaterals,
      });

      // Chỉ còn lại khách hàng 1 (Nguyễn Văn A), loại bỏ hoàn toàn khách hàng 2
      expect(data.length).toBe(1);
      const row = data[0];
      expect(row.customer.FullName).toBe('Nguyễn Văn A');
      expect(row.customer.CifKh).toBe('CIF001');
      expect(row.customer.CifKhlq).toBe('CIFLQ001');
      expect(row.customer.SpouseName).toBe('Trần Thị B');

      // Khoản vay
      expect(row.kunn.ContractNumber).toBe('KUNN-01');
      expect(row.masterHdtdNumber).toBe('2026/HĐTD/001');
      expect(row.grantedLimit).toBe(500_000_000);
      expect(row.principalAmount).toBe(200_000_000);
      expect(row.currentBalance).toBe(150_000_000);
      expect(row.interestRatePercent).toBe(10);
      expect(row.disbursementDate).toBe('2026-02-01');
      expect(row.kunnTenor).toBe('6 tháng');
      expect(row.kunnDueDate).toBe('2026-08-01');

      // TSBĐ khớp nối
      expect(row.matchedCollaterals.length).toBe(1);
      expect(row.matchedCollaterals[0].AssetCode).toBe('TS-BDS-01');
      expect(row.matchedCollaterals[0].AppraisedValue).toBe(800_000_000);
    });

    it('loại trừ khách hàng đã lưu trữ (ArchivedAt != null) khỏi danh mục đang vay', () => {
      const data = buildActivePortfolioData({
        customers: mockCustomers.map(c => c.Id === 1 ? { ...c, ArchivedAt: '2026-10-01T00:00:00Z' } : c),
        contracts: mockContracts,
        creditContracts: mockCreditContracts,
        collaterals: mockCollaterals,
      });
      expect(data).toHaveLength(0);
    });
  });

  describe('formatAppraisalDaysRemaining', () => {
    it('tính số ngày còn lại khi chưa hết hạn', () => {
      const col: Collateral = {
        Id: 1,
        CustomerId: 1,
        AppraisalDate: '2026-01-01',
        AppraisalTenorMonths: 12, // Hết hạn ngày 2027-01-01
      };
      const res = formatAppraisalDaysRemaining(col, '2026-06-01');
      expect(res.daysRemainingLabel).toContain('Còn');
      expect(res.expiryDate).toBe('01/01/2027');
    });

    it('tính số ngày quá hạn khi đã hết hạn', () => {
      const col: Collateral = {
        Id: 1,
        CustomerId: 1,
        AppraisalDate: '2025-01-01',
        AppraisalTenorMonths: 12, // Hết hạn ngày 2026-01-01
      };
      const res = formatAppraisalDaysRemaining(col, '2026-06-01');
      expect(res.daysRemainingLabel).toContain('Quá hạn');
    });

    it('xử lý an toàn khi không có ngày định giá', () => {
      const col: Collateral = { Id: 1, CustomerId: 1 };
      const res = formatAppraisalDaysRemaining(col, '2026-06-01');
      expect(res.daysRemainingLabel).toBe('Chưa có ngày ĐG');
      expect(res.expiryDate).toBe('—');
    });
  });

  describe('generateCustomerPortfolioWorkbook', () => {
    it('tạo thành công binary XLSX bytes chứa đầy đủ các sheet', () => {
      const bytes = generateCustomerPortfolioWorkbook({
        customers: mockCustomers,
        contracts: mockContracts,
        creditContracts: mockCreditContracts,
        collaterals: mockCollaterals,
      });

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(500);
    });

    it('tách bốn sheet: vay có TSBĐ, ma trận KUNN–TSBĐ, vay cầm cố, huy động; không còn cột KHLQ', () => {
      const text = new TextDecoder().decode(generateCustomerPortfolioWorkbook({
        customers: mockCustomers,
        contracts: mockContracts,
        creditContracts: mockCreditContracts,
        collaterals: mockCollaterals,
        pledge: {
          loans: [{
            Id: 7, CustomerId: 1, ContractNumber: 'CC-07', Amount: 90_000_000, InterestRate: 6.5,
            DisbursementDate: '2026-09-01', DueDate: '2026-12-01', LoanPurpose: null, IsClosed: false,
            ClosedDate: null, ClosedHow: null, LegacyCreditContractId: null, LegacyLoanContractId: null,
            Note: null, CreatedAt: '2026-09-01',
          }],
          links: [{ Id: 1, PledgeLoanId: 7, SavingsBookId: 5, PrincipalCovered: 90_000_000, ReleasedDate: null }],
          repayments: [],
          books: [{
            Id: 5, CustomerId: 1, BookNumber: 'STK-0005', DepositType: 'tg_vnd', Currency: 'VND', ExchangeRate: null,
            Amount: 100_000_000, InterestRate: 5.2, OpenDate: '2026-06-01', Tenor: 6, TenorUnit: 'thang',
            MaturityDate: null, InterestPaymentMethod: 'end_term', PaidInterest: 0, IsClosed: false,
            ClosedDate: null, ClosingInterest: null, MovedFromCollateralId: null, Note: null, CreatedAt: '2026-06-01',
          }],
        },
      }));
      for (const name of ['Vay_Co_TSBD', 'Chi_Tiet_KUNN_TSBD', 'Vay_Cam_Co', 'Huy_Dong']) {
        expect(text).toContain(`name="${name}"`);
      }
      expect(text).not.toContain('KHLQ');
      expect(text).not.toContain('CIFLQ001');
      expect(text).not.toContain('Trần Thị B');
      expect(text).toContain('CC-07');
      expect(text).toContain('STK-0005');
    });
  });
});
