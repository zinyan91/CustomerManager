-- 44_production_indexes_and_constraints.sql
-- Migration tối ưu hóa Chỉ mục (Indexes), Ràng buộc Khóa ngoại (Foreign Keys) và Bảo mật RLS cho PostgreSQL/Supabase

BEGIN;

-- 1. Bổ sung Chỉ mục (B-Tree Indexes) cho các trường tìm kiếm và liên kết
CREATE INDEX IF NOT EXISTS idx_customers_cif ON public."Customers" ("CifKh");
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public."Customers" ("NationalId");
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public."Customers" ("Phone");
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON public."Customers" ("FullName");

CREATE INDEX IF NOT EXISTS idx_credit_contracts_customer_id ON public."CreditContracts" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_credit_contracts_hdtd_number ON public."CreditContracts" ("HdtdNumber");
CREATE INDEX IF NOT EXISTS idx_credit_contracts_is_closed ON public."CreditContracts" ("IsClosed");

CREATE INDEX IF NOT EXISTS idx_loan_contracts_customer_id ON public."LoanContracts" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_loan_contracts_credit_contract_id ON public."LoanContracts" ("CreditContractId");
CREATE INDEX IF NOT EXISTS idx_loan_contracts_contract_number ON public."LoanContracts" ("ContractNumber");
CREATE INDEX IF NOT EXISTS idx_loan_contracts_is_closed ON public."LoanContracts" ("IsClosed");

CREATE INDEX IF NOT EXISTS idx_collaterals_customer_id ON public."Collaterals" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_collaterals_asset_code ON public."Collaterals" ("AssetCode");

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public."InventoryItems" ("CategoryName");
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON public."InventoryItems" ("Code");

CREATE INDEX IF NOT EXISTS idx_purchase_statements_date ON public."PurchaseStatements" ("StatementDate");
CREATE INDEX IF NOT EXISTS idx_retail_invoices_date ON public."RetailInvoices" ("InvoiceDate");

CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON public."QuizQuestions" ("Category");

-- 2. GIN Index cho các trường JSONB
CREATE INDEX IF NOT EXISTS idx_purchase_statements_items_gin ON public."PurchaseStatements" USING gin ("Items");
CREATE INDEX IF NOT EXISTS idx_retail_invoices_items_gin ON public."RetailInvoices" USING gin ("Items");
CREATE INDEX IF NOT EXISTS idx_quiz_questions_options_gin ON public."QuizQuestions" USING gin ("Options");

-- 3. Ràng buộc Khóa Ngoại bảo toàn dữ liệu (Foreign Key Constraints)
-- Khế ước nhận nợ (LoanContracts) buộc phải thuộc về một Hợp đồng Tín dụng (CreditContracts) hợp lệ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_loan_contracts_credit_contract' 
    AND table_name = 'LoanContracts'
  ) THEN
    ALTER TABLE public."LoanContracts"
      ADD CONSTRAINT fk_loan_contracts_credit_contract
      FOREIGN KEY ("CreditContractId")
      REFERENCES public."CreditContracts"("Id")
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Tài sản bảo đảm (Collaterals) liên kết với Khách hàng (Customers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_collaterals_customer' 
    AND table_name = 'Collaterals'
  ) THEN
    ALTER TABLE public."Collaterals"
      ADD CONSTRAINT fk_collaterals_customer
      FOREIGN KEY ("CustomerId")
      REFERENCES public."Customers"("Id")
      ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
