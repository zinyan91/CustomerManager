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
  MaritalStatus: string;
  KhlqRelationship?: string | null;   // Mối quan hệ: Vợ/Chồng, Người bảo lãnh, Bố/Mẹ, Con cái, Bên bảo đảm, Khác
  SpouseName?: string | null;         // Họ tên Vợ/Chồng / Người liên quan / Người bảo lãnh
  SpouseNationalId?: string | null;   // CCCD Vợ/Chồng / Người bảo lãnh
  SpousePhone?: string | null;        // SĐT Vợ/Chồng / Người bảo lãnh
  SpouseAccountNumber?: string | null;// STK Vợ/Chồng / Người bảo lãnh
  KhlqAddress?: string | null;        // Địa chỉ người liên quan / bảo lãnh
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

export interface LoanContract {
  Id: number;
  CustomerId: number;
  CollateralId?: number | null;
  ParentContractId?: number | null; // Dành cho KUNN thuộc HĐTD Hạn mức
  ContractNumber: string;
  ContractType: number;              // 0: HMTD, 1: TermLoan, 2: HMTD từng lần, 3: Thẻ tín dụng, 4: Cầm cố STK...
  LoanMethod?: string | null;        // Phương thức vay (Hạn mức tín dụng, Hạn mức tín dụng từng lần, Cho vay từng lần, Hạn mức thẻ tín dụng, Cầm cố sổ tiết kiệm)

  // HĐTD fields (Hợp Đồng Tín Dụng)
  ContractAmount?: number;           // Tổng mức cấp (HĐTD level)
  ContractStartDate?: string | null; // Ngày HĐ có hiệu lực
  ContractEndDate?: string | null;   // Ngày kết thúc HĐ
  LoanTenorMonths?: number | null;   // Thời hạn vay (tháng)
  HdtdDueDate?: string | null;       // Ngày kết thúc HĐTD (legacy)

  // KUNN fields (Giấy Nhận Nợ)
  LoanAmount?: number | null;        // Số tiền nhận nợ (KUNN level)
  CurrentBalance?: number | null;    // Dư nợ hiện hữu
  DisbursementDate?: string | null;  // Ngày giải ngân (ngày bắt đầu nhận nợ)
  KunnDueDate?: string | null;       // Ngày kết thúc KUNN
  KunnTenor?: string | null;         // Thời hạn KUNN (e.g. "5T", "10 năm")
  RepaymentStartDate?: string | null;// Ngày bắt đầu trả nợ

  // Detailed Interest Rates
  InterestRate?: number | null;           // Lãi suất áp dụng hiện tại (%/năm decimal, e.g. 0.085)
  PreferentialRate?: number | null;       // Lãi suất ưu đãi (LSUD)
  PreferentialPeriodMonths?: number | null; // Thời gian ưu đãi (tháng)
  BaseRate?: number | null;               // Lãi suất cơ sở (LSCS)
  MarginRate?: number | null;             // Biên độ lãi suất
  PostPreferentialRate?: number | null;   // Lãi suất sau ưu đãi = LSUD + Biên độ
  NormalRate?: number | null;             // Lãi suất thông thường = LSCS + Biên độ

  // Repayment Methods & Grace
  PrincipalRepaymentMethod?: string | null; // Cách thức trả gốc
  InterestRepaymentMethod?: string | null;  // Cách thức trả lãi
  PrincipalGracePeriodMonths?: number | null; // Ân hạn gốc (tháng)
  InterestGracePeriodMonths?: number | null;  // Ân hạn lãi (tháng)

  // Other
  LoanPurpose?: string | null;       // Mô tả mục đích vay (free text)
  LoanPurposeType?: string | null;   // Loại mục đích vay (Kinh doanh, tiêu dùng...)
  DebtGroup?: number;                // Nhóm nợ (1-5)
  IsSettled?: boolean;
  IsRestructured?: boolean;
  Note?: string | null;

  customer?: Customer;
  collateral?: Collateral;
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
  Note?: string | null;
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
