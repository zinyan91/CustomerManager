export interface Customer {
  Id: number;

  OwnerId?: string | null;
  CifKh: string;
  CifKhlq?: string | null;
  FullName: string;
  NationalId?: string | null;
  IdCardIssueDate?: string | null;
  IdCardIssuePlace?: string | null;
  Phone?: string | null;
  Email?: string | null;
  Address?: string | null;
  AccountNumber?: string | null;
  MaritalStatus: string;
  KhlqRelationship?: string | null;
  SpouseName?: string | null;
  SpouseNationalId?: string | null;
  SpousePhone?: string | null;
  SpouseAccountNumber?: string | null;
  KhlqAddress?: string | null;
  SpouseIncome?: number;
  MonthlyIncome?: number;
  CreditRating?: string;
  CreditScore?: number;
  CicStatus?: string;
  ArchivedAt?: string | null;
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
  AppraisalTenorMonths?: number | null;
  AppraisalExpiryDate?: string | null;
  Note?: string | null;
  MovedToSavingsBookId?: number | null;
  customer?: Customer;
}

export interface ContractCollateral {
  Id: number;
  ContractId: number;
  CollateralId: number;
  AllocatedValue?: number;
  Note?: string | null;
  collateral?: Collateral;
}

export interface MortgageContract {
  Id: number;
  CustomerId: number;
  MortgageNumber: string;
  SignedDate?: string | null;
  Pledgor?: string | null;
  MaxSecuredAmount?: number | null;
  NotaryNumber?: string | null;
  NotaryDate?: string | null;
  NotaryOffice?: string | null;
  RegistrationDate?: string | null;
  RegistrationOffice?: string | null;
  IsReleased: boolean;
  ReleasedDate?: string | null;
  Note?: string | null;
  CreatedAt?: string;
  CollateralIds: number[];
  CreditContractIds: number[];
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
  LoanPurposeType?: string | null;

  PreferentialRate?: number | null;
  PreferentialPeriodMonths?: number | null;
  PostPreferentialRate?: number | null;
  BaseRate?: number | null;
  MarginRate?: number | null;
  NormalRate?: number | null;
  InterestRate?: number | null;

  CollateralIds?: string | null;

  IsClosed?: boolean;
  ClosedDate?: string | null;
  Note?: string | null;
  CreatedAt?: string;

  customer?: Customer;
  MovedToPledgeLoanId?: number | null;
}

export interface LoanContract {
  Id: number;
  CustomerId: number;
  CreditContractId?: number | null;
  CollateralId?: number | null;
  ParentContractId?: number | null;
  ContractNumber: string;
  ContractType: number;
  LoanMethod?: string | null;

  ContractAmount?: number;

  CreditLimitCode?: string | null;

  CreditLimitAmount?: number | null;
  ContractStartDate?: string | null;
  ContractEndDate?: string | null;
  LoanTenorMonths?: number | null;

  LoanAmount?: number | null;
  CurrentBalance?: number | null;
  DisbursementDate?: string | null;
  KunnDueDate?: string | null;
  KunnTenor?: string | null;
  RepaymentStartDate?: string | null;

  InterestRate?: number | null;
  PreferentialRate?: number | null;
  PreferentialPeriodMonths?: number | null;
  BaseRate?: number | null;
  MarginRate?: number | null;
  PostPreferentialRate?: number | null;
  NormalRate?: number | null;
  RateFloorAnnual?: number | null;

  PrincipalRepaymentMethod?: string | null;
  InterestRepaymentMethod?: string | null;
  PrincipalGracePeriodMonths?: number | null;
  InterestGracePeriodMonths?: number | null;
  MonthlyPrincipalAmount?: number | null;

  LoanPurpose?: string | null;
  LoanPurposeType?: string | null;
  DebtGroup?: number;
  IsSettled?: boolean;
  SettledDate?: string | null;
  IsRestructured?: boolean;
  Note?: string | null;

  customer?: Customer;
  collateral?: Collateral;
  CollateralIds?: string | null;
  PenaltySurcharge?: number | null;
  PrincipalPenaltyMultiplier?: number | null;
  RateHistory?: RateAdjustmentHistoryItem[] | string | null;
  contractCollaterals?: ContractCollateral[];
  MovedToPledgeLoanId?: number | null;
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
  ActualPaidAmount?: number;
  OverdueDays?: number;
  OverdueInterestAmount?: number;
  ActualPaidPrincipal?: number;
  ActualPaidInterest?: number;
  PrepaidPrincipalAmount?: number;
  Note?: string | null;
}

export interface RateAdjustmentHistoryItem {
  id: string;
  effectiveDate: string;
  ratePercent: number;
  baseRatePercent?: number;
  marginPercent?: number;
  penaltyPercent?: number;
  reason?: string;
}

export interface CollateralAppraisal {
  Id: number;
  CollateralId: number;
  AppraisalDate: string;
  TenorMonths: number;
  ExpiryDate?: string;
  AppraisedValue: number;
  AssetType?: string | null;
  LtvPercent: number;
  PerformedBy?: string | null;
  Note?: string | null;
  CreatedAt?: string;
}

export type ControlResult = 'pass' | 'watch' | 'fail';

export interface PostLoanControlRecord {
  Id: number;
  ControlType: 'purpose' | 'periodic' | 'collateral';
  ControlKey: string;
  CustomerId: number;
  ContractId?: number | null;
  MasterHdtd?: string | null;
  CollateralId?: number | null;
  PeriodIndex: number;
  DueDate: string;
  PerformedDate: string;
  PerformedBy?: string | null;
  Result: ControlResult;
  Findings?: string | null;
  AppraisalId?: number | null;
  CreatedAt?: string;
}

export interface CardContract {
  Id: number;
  CustomerId: number;
  CardContractNumber: string;
  CardHolderSide: 'KH' | 'KHLQ';
  CardHolderName?: string | null;
  CardProducts?: string | null;
  GrantedLimit?: number | null;
  PolicyCode?: string | null;
  CollateralKind?: 'KHONG_TSBD' | 'TIEN_GUI' | 'CO_TSBD' | null;
  CollateralId?: number | null;
  TenorMonths?: number | null;
  IssueDate?: string | null;
  ExpiryDate?: string | null;
  IsClosed?: boolean;
  Note?: string | null;
  customer?: Customer;
}

export interface CardSupplementaryHolder {
  Id: number;
  CardContractId: number;
  FullName: string;
  Relation: string;
  RelationNote?: string | null;
  NationalId?: string | null;
}

export * from './savingsPledge';
