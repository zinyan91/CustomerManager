-- 43_inventory_and_statements.sql
-- Migration bổ sung bảng lưu trữ Hàng tồn kho (InventoryItems), Bảng kê mua bán (PurchaseStatements) và Hóa đơn bán lẻ (RetailInvoices) trong CSDL PostgreSQL/Supabase

BEGIN;

-- 1. Bảng Hàng Tồn Kho (InventoryItems)
CREATE TABLE IF NOT EXISTS public."InventoryItems" (
  "Id"            text PRIMARY KEY,
  "CategoryName"  text NOT NULL DEFAULT 'Lúa Gạo',
  "Code"          text NOT NULL DEFAULT '',
  "Name"          text NOT NULL DEFAULT '',
  "Unit"          text NOT NULL DEFAULT 'Kg',
  "UnitPrice"     numeric NOT NULL DEFAULT 0 CHECK ("UnitPrice" >= 0),
  "BeginningQty"  numeric NOT NULL DEFAULT 0 CHECK ("BeginningQty" >= 0),
  "ImportQty"     numeric NOT NULL DEFAULT 0 CHECK ("ImportQty" >= 0),
  "ExportQty"     numeric NOT NULL DEFAULT 0 CHECK ("ExportQty" >= 0),
  "CreatedAt"     timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"     timestamptz NOT NULL DEFAULT now()
);

-- 2. Bảng Bảng Kê Mua Bán Hàng Hóa Dịch Vụ (PurchaseStatements)
CREATE TABLE IF NOT EXISTS public."PurchaseStatements" (
  "Id"               text PRIMARY KEY,
  "SellerName"       text NOT NULL,
  "SellerAddress"    text,
  "SellerIdCard"     text,
  "SellerBankAcc"    text,
  "PaymentMethod"    text DEFAULT 'transfer',
  "BuyerName"        text,
  "BuyerIdCard"      text,
  "StatementDate"    date NOT NULL DEFAULT CURRENT_DATE,
  "Items"            jsonb NOT NULL DEFAULT '[]'::jsonb,
  "CreatedAt"        timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"        timestamptz NOT NULL DEFAULT now()
);

-- 3. Bảng Hóa Đơn Bán Lẻ (RetailInvoices)
CREATE TABLE IF NOT EXISTS public."RetailInvoices" (
  "Id"               text PRIMARY KEY,
  "InvoiceNo"        text NOT NULL,
  "InvoiceDate"      date NOT NULL DEFAULT CURRENT_DATE,
  "CustomerName"     text NOT NULL,
  "CustomerPhone"    text,
  "CustomerAddress" text,
  "PaymentMethod"    text DEFAULT 'cash',
  "Items"            jsonb NOT NULL DEFAULT '[]'::jsonb,
  "Discount"         numeric DEFAULT 0,
  "Note"             text,
  "CreatedAt"        timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"        timestamptz NOT NULL DEFAULT now()
);

-- Bật RLS
ALTER TABLE public."InventoryItems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PurchaseStatements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RetailInvoices" ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS mở cho truy vấn và lưu dữ liệu
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_items_all') THEN
    CREATE POLICY "inventory_items_all" ON public."InventoryItems" FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'purchase_statements_all') THEN
    CREATE POLICY "purchase_statements_all" ON public."PurchaseStatements" FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'retail_invoices_all') THEN
    CREATE POLICY "retail_invoices_all" ON public."RetailInvoices" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
