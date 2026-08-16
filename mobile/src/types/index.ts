export interface Customer {
  Id: number;
  OwnerId?: string | null;
  CifKh: string;
  CifKhlq?: string | null;
  FullName: string;
  NationalId?: string | null;
  Phone?: string | null;
  Email?: string | null;
  Address?: string | null;
  AccountNumber?: string | null;
  MaritalStatus?: string;
  MonthlyIncome?: number;
  CreditRating?: string;
  CreditScore?: number;
  CicStatus?: string;
}

export interface CreditContract {
  Id: number;
  CustomerId: number;
  HdtdNumber: string;
  ApprovalCode?: string | null;
  ApprovalAmount?: number | null;
  LoanMethod?: string | null;
  ContractAmount?: number | null;
  ContractStartDate?: string | null;
  ContractEndDate?: string | null;
  LoanTenorMonths?: number | null;
  LoanPurpose?: string | null;
  NormalRate?: number | null;
  IsClosed?: boolean;
  Note?: string | null;
  customer?: Customer;
}

export interface LoanContract {
  Id: number;
  CustomerId: number;
  CreditContractId?: number | null;
  ContractNumber: string;
  ContractType?: number;
  ContractAmount?: number;
  LoanAmount?: number;
  CurrentBalance?: number;
  DisbursementDate?: string | null;
  RepaymentStartDate?: string | null;
  ContractStartDate?: string | null;
  ContractEndDate?: string | null;
  KunnDueDate?: string | null;
  KunnTenor?: string | null;
  LoanTenorMonths?: number | null;
  LoanMethod?: string | null;
  HdtdDueDate?: string | null;
  InterestRate?: number | null;
  DebtGroup?: number;
  IsSettled?: boolean;
  Note?: string | null;
  customer?: Customer;
}

export interface Collateral {
  Id: number;
  CustomerId: number;
  AssetCode?: string | null;
  Address?: string | null;
  AppraisedValue?: number;
  Value?: number;
  AssetType?: string;
  LtvPercent?: number;
  AppraisalDate?: string | null;
  AppraisalExpiryDate?: string | null;
  Note?: string | null;
  customer?: Customer;
}

export interface CardContract {
  Id: number;
  CustomerId: number;
  CardContractNumber: string;
  CardNumber?: string | null;
  CardHolderSide?: 'KH' | 'KHLQ';
  CardHolderName?: string | null;
  CardProducts?: string | null;
  CardType?: string | null;
  GrantedLimit?: number | null;
  CardLimit?: number | null;
  PolicyCode?: string | null;
  CollateralKind?: string | null;
  TenorMonths?: number | null;
  IssueDate?: string | null;
  ExpiryDate?: string | null;
  IsClosed?: boolean;
  Note?: string | null;
  customer?: Customer;
}

export type ControlResult = 'pass' | 'watch' | 'fail';

export interface PostLoanControlRecord {
  Id: number;
  ControlType?: 'purpose' | 'periodic' | 'collateral' | string;
  ControlKey?: string;
  ContractNumber?: string;
  CustomerId: number;
  ContractId?: number | null;
  PeriodIndex?: number;
  InspectionRound?: number;
  DueDate: string;
  PerformedDate?: string;
  ActualDate?: string;
  PerformedBy?: string | null;
  Result?: ControlResult | string;
  Status?: string;
  Findings?: string | null;
  Notes?: string | null;
  customer?: Customer;
}

export interface RepaymentSchedule {
  Id: number;
  ContractId: number;
  PeriodNumber: number;
  DueDate: string;
  PrincipalAmount: number;
  InterestAmount: number;
  TotalAmount: number;
  IsPaid: boolean;
  PaymentDate?: string | null;
  OverdueDays?: number;
  contract?: LoanContract;
}
