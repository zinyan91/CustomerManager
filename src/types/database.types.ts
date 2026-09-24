/**
 * TypeScript Database Definitions for Supabase PostgreSQL
 * Customer Manager System
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      Customers: {
        Row: {
          Id: number;
          OwnerId: string | null;
          CifKh: string;
          CifKhlq: string | null;
          FullName: string;
          NationalId: string | null;
          Phone: string | null;
          Email: string | null;
          Address: string | null;
          AccountNumber: string | null;
          MaritalStatus: string;
          KhlqRelationship: string | null;
          SpouseName: string | null;
          SpouseNationalId: string | null;
          SpousePhone: string | null;
          SpouseAccountNumber: string | null;
          KhlqAddress: string | null;
          SpouseIncome: number | null;
          MonthlyIncome: number | null;
          CreditRating: string | null;
          CreditScore: number | null;
          CicStatus: string | null;
          ArchivedAt: string | null;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['Customers']['Row'], 'Id' | 'CreatedAt' | 'UpdatedAt'> & {
          Id?: number;
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['Customers']['Insert']>;
      };

      CreditContracts: {
        Row: {
          Id: number;
          CustomerId: number;
          HdtdNumber: string;
          ApprovalCode: string | null;
          ApprovalAmount: number | null;
          LoanMethod: string | null;
          ContractAmount: number | null;
          ContractStartDate: string | null;
          ContractEndDate: string | null;
          LoanTenorMonths: number | null;
          LoanPurpose: string | null;
          LoanPurposeType: string | null;
          PreferentialRate: number | null;
          PreferentialPeriodMonths: number | null;
          PostPreferentialRate: number | null;
          BaseRate: number | null;
          MarginRate: number | null;
          NormalRate: number | null;
          InterestRate: number | null;
          CollateralIds: string | null;
          IsClosed: boolean;
          ClosedDate: string | null;
          Note: string | null;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['CreditContracts']['Row'], 'Id' | 'CreatedAt' | 'UpdatedAt'> & {
          Id?: number;
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['CreditContracts']['Insert']>;
      };

      LoanContracts: {
        Row: {
          Id: number;
          CustomerId: number;
          CreditContractId: number | null;
          CollateralId: number | null;
          ParentContractId: number | null;
          ContractNumber: string;
          ContractType: number;
          LoanMethod: string | null;
          ContractAmount: number;
          CreditLimitCode: string | null;
          ContractStartDate: string;
          ContractEndDate: string;
          LoanTenorMonths: number;
          DisbursementDate: string;
          FirstRepaymentDate: string;
          PrincipalRepaymentMethod: number;
          MonthlyPrincipalAmount: number;
          PrincipalGracePeriodMonths: number;
          NormalInterestRate: number;
          InterestPaymentFrequencyMonths: number;
          InterestGracePeriodMonths: number;
          InterestCalculationMethod: number;
          OverdueInterestMultiplier: number;
          LatePaymentInterestMultiplier: number;
          CurrentPrincipalBalance: number;
          CurrentInterestBalance: number;
          OverduePrincipal: number;
          OverdueInterest: number;
          TotalPrincipalPaid: number;
          TotalInterestPaid: number;
          NextPaymentDueDate: string | null;
          DebtGroup: number;
          DaysOverdue: number;
          ContractStatus: number;
          IsClosed: boolean;
          ClosedDate: string | null;
          Note: string | null;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['LoanContracts']['Row'], 'Id' | 'CreatedAt' | 'UpdatedAt'> & {
          Id?: number;
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['LoanContracts']['Insert']>;
      };

      Collaterals: {
        Row: {
          Id: number;
          CustomerId: number;
          AssetCode: string | null;
          Address: string | null;
          AppraisedValue: number | null;
          Value: number | null;
          AssetType: string | null;
          LtvPercent: number | null;
          AppraisalDate: string | null;
          AppraisalTenorMonths: number | null;
          AppraisalExpiryDate: string | null;
          Note: string | null;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['Collaterals']['Row'], 'Id' | 'CreatedAt' | 'UpdatedAt'> & {
          Id?: number;
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['Collaterals']['Insert']>;
      };

      MortgageContracts: {
        Row: {
          Id: number;
          CustomerId: number;
          MortgageNumber: string;
          SignedDate: string | null;
          Pledgor: string | null;
          MaxSecuredAmount: number | null;
          NotaryNumber: string | null;
          NotaryDate: string | null;
          NotaryOffice: string | null;
          RegistrationDate: string | null;
          RegistrationOffice: string | null;
          IsReleased: boolean;
          ReleasedDate: string | null;
          Note: string | null;
          CreatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['MortgageContracts']['Row'], 'Id' | 'CreatedAt'> & {
          Id?: number;
          CreatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['MortgageContracts']['Insert']>;
      };

      MortgageContractCollaterals: {
        Row: { MortgageContractId: number; CollateralId: number };
        Insert: { MortgageContractId: number; CollateralId: number };
        Update: Partial<{ MortgageContractId: number; CollateralId: number }>;
      };

      MortgageContractCreditContracts: {
        Row: { MortgageContractId: number; CreditContractId: number };
        Insert: { MortgageContractId: number; CreditContractId: number };
        Update: Partial<{ MortgageContractId: number; CreditContractId: number }>;
      };

      InventoryItems: {
        Row: {
          Id: string;
          CategoryName: string;
          Code: string;
          Name: string;
          Unit: string;
          UnitPrice: number;
          BeginningQty: number;
          ImportQty: number;
          ExportQty: number;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['InventoryItems']['Row'], 'CreatedAt' | 'UpdatedAt'> & {
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['InventoryItems']['Insert']>;
      };

      PurchaseStatements: {
        Row: {
          Id: string;
          SellerName: string;
          SellerAddress: string | null;
          SellerIdCard: string | null;
          SellerBankAcc: string | null;
          PaymentMethod: string | null;
          BuyerName: string | null;
          BuyerIdCard: string | null;
          StatementDate: string;
          Items: Json;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['PurchaseStatements']['Row'], 'CreatedAt' | 'UpdatedAt'> & {
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['PurchaseStatements']['Insert']>;
      };

      RetailInvoices: {
        Row: {
          Id: string;
          InvoiceNo: string;
          InvoiceDate: string;
          CustomerName: string;
          CustomerPhone: string | null;
          CustomerAddress: string | null;
          PaymentMethod: string | null;
          Items: Json;
          Discount: number | null;
          Note: string | null;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['RetailInvoices']['Row'], 'CreatedAt' | 'UpdatedAt'> & {
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['RetailInvoices']['Insert']>;
      };

      QuizQuestions: {
        Row: {
          Id: number;
          QuestionText: string;
          Category: string | null;
          Options: Json;
          CorrectAnswers: Json;
          Explanation: string | null;
          IsPendingAnswer: boolean;
          CreatedAt: string;
          UpdatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['QuizQuestions']['Row'], 'Id' | 'CreatedAt' | 'UpdatedAt'> & {
          Id?: number;
          CreatedAt?: string;
          UpdatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['QuizQuestions']['Insert']>;
      };
    };
  };
}
