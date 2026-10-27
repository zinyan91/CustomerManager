import type { DepositInterestPaymentMethod, PledgeDepositType, TenorUnit } from '../lib/stkPledge';
import type { Customer } from './index';

export type PledgeRepaymentKind = 'partial' | 'full' | 'due' | 'offset';

export interface SavingsBook {
  Id: number;
  CustomerId: number;
  BookNumber: string;
  DepositType: PledgeDepositType;
  Currency: string;
  ExchangeRate: number | null;
  Amount: number;
  /** Phần trăm/năm: 5.2 = 5,2%. */
  InterestRate: number | null;
  OpenDate: string | null;
  Tenor: number | null;
  TenorUnit: TenorUnit | null;
  MaturityDate: string | null;
  InterestPaymentMethod: DepositInterestPaymentMethod;
  PaidInterest: number;
  IsClosed: boolean;
  ClosedDate: string | null;
  ClosingInterest: number | null;
  MovedFromCollateralId: number | null;
  Note: string | null;
  CreatedAt: string;
}

export interface PledgeLoan {
  Id: number;
  CustomerId: number;
  ContractNumber: string;
  Amount: number;
  /** Phần trăm/năm: 6.5 = 6,5%. */
  InterestRate: number;
  DisbursementDate: string;
  DueDate: string;
  LoanPurpose: string | null;
  IsClosed: boolean;
  ClosedDate: string | null;
  ClosedHow: PledgeRepaymentKind | null;
  LegacyCreditContractId: number | null;
  LegacyLoanContractId: number | null;
  Note: string | null;
  CreatedAt: string;
  customer?: Customer;
}

export interface PledgeLoanLink {
  Id: number;
  PledgeLoanId: number;
  SavingsBookId: number;
  PrincipalCovered: number;
  ReleasedDate: string | null;
  Note?: string | null;
}

export interface PledgeLoanRepayment {
  Id: number;
  PledgeLoanId: number;
  RepaymentDate: string;
  Kind: PledgeRepaymentKind;
  PrincipalPaid: number;
  InterestPaid: number;
  PenaltyPaid: number;
  OffsetSavingsBookId: number | null;
  Note: string | null;
  CreatedAt: string;
}

export interface PledgeBundle {
  loans: PledgeLoan[];
  links: PledgeLoanLink[];
  repayments: PledgeLoanRepayment[];
  books: SavingsBook[];
}
