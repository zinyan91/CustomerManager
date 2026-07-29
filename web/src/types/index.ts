export interface Customer {
  id: number;
  cif_kh: string;
  cif_khlq?: string | null;
  full_name: string;
  national_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  account_number?: string | null;
  spouse_account_number?: string | null;
  marital_status: string;
  spouse_name?: string | null;
  spouse_national_id?: string | null;
  spouse_phone?: string | null;
  spouse_income: number;
  monthly_income: number;
  credit_rating: string;
  credit_score: number;
  cic_status: string;
  created_at?: string;
}

export interface Collateral {
  id: number;
  customer_id: number;
  asset_code?: string | null;
  asset_name: string;
  asset_type: string;
  main_asset_group: string;
  real_estate_class: string;
  address?: string | null;
  appraised_value: number;
  appraisal_date?: string | null;
  appraisal_validity_period?: string | null;
  appraisal_expiry_date?: string | null;
  days_remaining?: number;
  remarks?: string | null;
  customer?: Customer;
}

export interface LoanContract {
  id: number;
  customer_id: number;
  collateral_id?: number | null;
  contract_number: string;
  contract_type: number; // 0: HMTD, 1: TermLoan
  credit_limit: number;
  disbursed_amount: number;
  outstanding_balance: number;
  interest_rate: number;
  signed_date?: string | null;
  contract_expiry_date?: string | null;
  contract_term?: string | null;
  max_debt_group: number;
  customer?: Customer;
  collateral?: Collateral;
  drawdowns?: Loan[];
}

export interface Loan {
  id: number;
  loan_contract_id: number;
  disbursement_date: string;
  first_repayment_date?: string | null;
  disbursed_amount: number;
  outstanding_balance: number;
  term_months: number;
  grace_period_months: number;
  repayment_day_of_month: number;
  interest_rate: number;
  expiry_date?: string | null;
  purpose: string;
  schedules?: LoanSchedule[];
}

export interface LoanSchedule {
  id: number;
  loan_id: number;
  period_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  total_due: number;
  remaining_principal: number;
  is_paid: boolean;
}

export interface CreditCard {
  id: number;
  customer_id: number;
  card_type_classification: string;
  card_number?: string | null;
  credit_limit: number;
  outstanding_balance: number;
  remarks?: string | null;
  customer?: Customer;
}
