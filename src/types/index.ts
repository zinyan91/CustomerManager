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
  HdtdDueDate?: string | null;

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

export interface CreditCard {
  Id: number;
  CustomerId: number;
  IssuanceType?: string;
  CardNumber?: string | null;
  CreditLimit?: number;
  CurrentBalance?: number;
  CollateralId?: number | null;
  IsLtvException?: boolean;
  LtvExceptionReason?: string | null;
  Note?: string | null;
  customer?: Customer;
  collateral?: Collateral;
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

export interface BusinessPlan {
  Id: number;
  CustomerId: number;
  CreditContractId?: number | null;
  PlanKind: 'limit' | 'each_time';
  ActualYear: number;
  PlanYear: number;
  BalanceSheetDate: string;

  Cash: number;
  Inventory: number;
  Receivables: number;
  OtherCurrentAssets: number;
  LongTermReceivables: number;
  FixedAssets: number;
  OtherLongTermAssets: number;
  ShortTermDebt: number;
  OtherShortTermDebt: number;
  LongTermDebt: number;
  OtherLongTermDebt: number;

  ActualRevenueAnnual: number;
  ActualCogsRatioPercent: number;
  ActualDepreciationAnnual: number;
  ActualTaxAnnual: number;
  ActualStaffMonthly: number;
  ActualPremisesMonthly: number;
  ActualUtilitiesMonthly: number;
  ActualOtherMonthly: number;

  PlanRevenueAnnual: number;
  PlanCogsRatioPercent: number;
  PlanDepreciationAnnual: number;
  PlanTaxAnnual: number;
  PlanStaffMonthly: number;
  PlanPremisesMonthly: number;
  PlanUtilitiesMonthly: number;
  PlanOtherMonthly: number;

  RequestedLimitActual: number;
  RequestedLimitPlan: number;

  OtherIncomeMonthly: number;
  LivingExpenseMonthly: number;
  ExistingDebtPaymentMonthly: number;
  MaxDtiPercent: number;

  ProjectCost: number;
  OwnFunds: number;
  TenorMonths: number;
  RateAnnualPercent: number;

  BasisRevenue?: string | null;
  BasisCogs?: string | null;
  BasisStaff?: string | null;
  BasisPremises?: string | null;
  BasisUtilities?: string | null;
  BasisInterest?: string | null;
  BasisDepreciation?: string | null;
  BasisOther?: string | null;
  BasisTax?: string | null;
  BasisProfit?: string | null;

  Note?: string | null;
  CreatedBy?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface BusinessPlanDebt {
  Id: number;
  PlanId: number;
  Label: string;
  Principal: number;
  RateAnnualPercent: number;
  Scope: 'both' | 'plan';
  SortOrder: number;
  CreatedAt?: string;
}
