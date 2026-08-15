-- Migration 47: Bảng đồng bộ Mẫu Ngành Hàng Tồn Kho và Mẫu Bảng Kê / Hóa Đơn Bán Lẻ
-- Hỗ trợ lưu trữ đám mây Supabase PostgreSQL, đồng bộ đa thiết bị theo mô hình Hybrid Offline-First

-- 1. Bảng Mẫu Ngành Hàng Tồn Kho (InventoryCategoryTemplates)
CREATE TABLE IF NOT EXISTS public."InventoryCategoryTemplates" (
    "Id" text PRIMARY KEY,
    "Name" text NOT NULL,
    "Items" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
    "OwnerId" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_inventory_tpl_owner" ON public."InventoryCategoryTemplates" ("OwnerId");
ALTER TABLE public."InventoryCategoryTemplates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_tpl_all_access" ON public."InventoryCategoryTemplates";
CREATE POLICY "inventory_tpl_all_access" ON public."InventoryCategoryTemplates"
    FOR ALL
    TO public, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Bảng Mẫu Bảng Kê Mua Bán & Hóa Đơn Bán Lẻ (StatementTemplates)
CREATE TABLE IF NOT EXISTS public."StatementTemplates" (
    "Id" text PRIMARY KEY,
    "Kind" text NOT NULL DEFAULT 'purchase_statement', -- 'purchase_statement' | 'retail_invoice'
    "Name" text NOT NULL,
    "SellerInfo" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "Items" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
    "OwnerId" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_statement_tpl_kind" ON public."StatementTemplates" ("Kind");
CREATE INDEX IF NOT EXISTS "idx_statement_tpl_owner" ON public."StatementTemplates" ("OwnerId");
ALTER TABLE public."StatementTemplates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statement_tpl_all_access" ON public."StatementTemplates";
CREATE POLICY "statement_tpl_all_access" ON public."StatementTemplates"
    FOR ALL
    TO public, authenticated
    USING (true)
    WITH CHECK (true);
