import { describe, it, expect } from 'vitest';
import type { Customer, PledgeBundle, SavingsBook, PledgeLoan } from '../../types';
import { buildDepositPortfolioData } from '../depositPortfolio';

const customers: Customer[] = [
  { Id: 1, CifKh: 'CIF1', FullName: 'Bùi Văn B', MaritalStatus: 'Độc thân' },
  { Id: 2, CifKh: 'CIF2', FullName: 'An Thị A', MaritalStatus: 'Độc thân' },
  { Id: 3, CifKh: 'CIF3', FullName: 'Đã Lưu Trữ', ArchivedAt: '2026-10-01T00:00:00Z', MaritalStatus: 'Độc thân' },
];

function book(over: Partial<SavingsBook>): SavingsBook {
  return {
    Id: 1, CustomerId: 1, BookNumber: 'S1', DepositType: 'tg_vnd', Currency: 'VND', ExchangeRate: null,
    Amount: 100_000_000, InterestRate: 5, OpenDate: '2026-01-10', Tenor: 6, TenorUnit: 'thang',
    MaturityDate: null, InterestPaymentMethod: 'end_term', PaidInterest: 0, IsClosed: false,
    ClosedDate: null, ClosingInterest: null, MovedFromCollateralId: null, Note: null, CreatedAt: '2026-01-10',
    ...over,
  };
}

function loan(over: Partial<PledgeLoan>): PledgeLoan {
  return {
    Id: 1, CustomerId: 1, ContractNumber: 'CC-1', Amount: 50_000_000, InterestRate: 6,
    DisbursementDate: '2026-02-01', DueDate: '2026-08-01', LoanPurpose: null, IsClosed: false,
    ClosedDate: null, ClosedHow: null, LegacyCreditContractId: null, LegacyLoanContractId: null,
    Note: null, CreatedAt: '2026-02-01', ...over,
  };
}

describe('buildDepositPortfolioData', () => {
  const bundle: PledgeBundle = {
    books: [
      book({ Id: 1, CustomerId: 1, BookNumber: 'S1' }),
      book({ Id: 2, CustomerId: 2, BookNumber: 'S2', DepositType: 'tg_foreign', Currency: 'USD', ExchangeRate: 25_000, Amount: 1_000 }),
      book({ Id: 3, CustomerId: 1, BookNumber: 'S3', IsClosed: true }),
      book({ Id: 4, CustomerId: 3, BookNumber: 'S4' }),
    ],
    loans: [loan({ Id: 1, ContractNumber: 'CC-1' }), loan({ Id: 2, ContractNumber: 'CC-2', IsClosed: true })],
    links: [
      { Id: 1, PledgeLoanId: 1, SavingsBookId: 1, PrincipalCovered: 50_000_000, ReleasedDate: null },
      { Id: 2, PledgeLoanId: 2, SavingsBookId: 2, PrincipalCovered: 10_000_000, ReleasedDate: null },
    ],
    repayments: [],
  };

  it('lấy mọi sổ đang mở của khách chưa lưu trữ, sắp theo tên khách', () => {
    const rows = buildDepositPortfolioData(bundle, customers);
    expect(rows.map(r => r.book.BookNumber)).toEqual(['S2', 'S1']);
  });

  it('quy đổi ngoại tệ sang VNĐ theo tỷ giá và tính ngày đáo hạn từ kỳ hạn', () => {
    const [usd, vnd] = buildDepositPortfolioData(bundle, customers);
    expect(usd.amountVnd).toBe(25_000_000);
    expect(vnd.amountVnd).toBe(100_000_000);
    expect(vnd.maturityDate).toBe('2026-07-10');
    expect(vnd.tenorLabel).toBe('6 tháng');
  });

  it('chỉ ghi hợp đồng cầm cố còn dư nợ đang giữ sổ', () => {
    const [usd, vnd] = buildDepositPortfolioData(bundle, customers);
    expect(vnd.pledgedContracts).toEqual(['CC-1']);
    expect(usd.pledgedContracts).toEqual([]);
  });
});
