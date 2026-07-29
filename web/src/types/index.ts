export interface Customer {
  Id: number;
  CifKh: string;
  CifKhlq?: string | null;
  FullName: string;
  NationalId?: string | null;
  Phone?: string | null;
  Email?: string | null;
  Address?: string | null;
  AccountNumber?: string | null;
  SpouseAccountNumber?: string | null;
  MaritalStatus: string;
  SpouseName?: string | null;
  SpouseNationalId?: string | null;
  SpousePhone?: string | null;
  SpouseIncome?: number;
  MonthlyIncome?: number;
  CreditRating?: string;
  CreditScore?: number;
  CicStatus?: string;
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
  Note?: string | null;
  customer?: Customer;
}

export interface LoanContract {
  Id: number;
  CustomerId: number;
  CollateralId?: number | null;
  ContractNumber: string;
  ContractType: number; // 0: HMTD, 1: TermLoan
  ContractAmount?: number;
  DebtGroup?: number;
  IsSettled?: boolean;
  IsRestructured?: boolean;
  customer?: Customer;
  collateral?: Collateral;
}

export interface CreditCard {
  Id: number;
  CustomerId: number;
  IssuanceType?: string;
  CardNumber?: string | null;
  CreditLimit?: number;
  Limit?: number;
  CurrentBalance?: number;
  Note?: string | null;
  customer?: Customer;
}
