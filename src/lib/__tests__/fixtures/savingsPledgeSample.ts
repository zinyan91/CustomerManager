import type { PledgeBundle, PledgeLoan, PledgeLoanLink, PledgeLoanRepayment, SavingsBook } from '../../../types';

export function book(over: Partial<SavingsBook> & Pick<SavingsBook, 'Id' | 'BookNumber'>): SavingsBook {
  return {
    CustomerId: 1, DepositType: 'tg_vnd', Currency: 'VND', ExchangeRate: null,
    Amount: 0, InterestRate: null, OpenDate: null, Tenor: null, TenorUnit: null, MaturityDate: null,
    InterestPaymentMethod: 'end_term', PaidInterest: 0, IsClosed: false, ClosedDate: null,
    ClosingInterest: null, MovedFromCollateralId: null, Note: null, CreatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

export function loan(over: Partial<PledgeLoan> & Pick<PledgeLoan, 'Id' | 'ContractNumber'>): PledgeLoan {
  return {
    CustomerId: 1, Amount: 0, InterestRate: 0, DisbursementDate: '', DueDate: '', LoanPurpose: null,
    IsClosed: false, ClosedDate: null, ClosedHow: null, LegacyCreditContractId: null, LegacyLoanContractId: null,
    Note: null, CreatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

export function link(Id: number, PledgeLoanId: number, SavingsBookId: number, PrincipalCovered: number): PledgeLoanLink {
  return { Id, PledgeLoanId, SavingsBookId, PrincipalCovered, ReleasedDate: null };
}

export function repayment(over: Partial<PledgeLoanRepayment> & Pick<PledgeLoanRepayment, 'Id' | 'PledgeLoanId' | 'RepaymentDate' | 'Kind'>): PledgeLoanRepayment {
  return { PrincipalPaid: 0, InterestPaid: 0, PenaltyPaid: 0, OffsetSavingsBookId: null, Note: null, CreatedAt: '2026-01-01T00:00:00Z', ...over };
}

export const STK_001 = book({ Id: 1, BookNumber: 'STK-0123-001', Amount: 500000000, InterestRate: 5.2, OpenDate: '2026-04-15', Tenor: 12, TenorUnit: 'thang' });
export const STK_002 = book({ Id: 2, BookNumber: 'STK-0123-002', Amount: 300000000, InterestRate: 4.7, OpenDate: '2026-08-02', Tenor: 6, TenorUnit: 'thang' });
export const STK_003 = book({ Id: 3, BookNumber: 'STK-0123-003', Amount: 200000000, InterestRate: 4.1, OpenDate: '2026-10-10', Tenor: 3, TenorUnit: 'thang' });

export const CC_0418 = loan({ Id: 10, ContractNumber: 'CC-2026-0418', Amount: 400000000, InterestRate: 6.5, DisbursementDate: '2026-06-20', DueDate: '2027-02-15' });
export const CC_0907 = loan({ Id: 11, ContractNumber: 'CC-2026-0907', Amount: 350000000, InterestRate: 6.2, DisbursementDate: '2026-09-07', DueDate: '2027-02-02' });

export const LINKS: PledgeLoanLink[] = [
  link(100, 10, 1, 400000000),
  link(101, 11, 2, 290000000),
  link(102, 11, 1, 60000000),
];

export const SAMPLE: PledgeBundle = {
  loans: [CC_0418, CC_0907],
  links: LINKS,
  repayments: [],
  books: [STK_001, STK_002, STK_003],
};
