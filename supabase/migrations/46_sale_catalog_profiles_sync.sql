-- Migration 46: Bảng đồng bộ Đa Danh Mục Mặt Hàng Mua Bán (SaleCatalogProfiles)
-- Hỗ trợ lưu trữ đám mây, đồng bộ đa thiết bị và dự phòng offline

CREATE TABLE IF NOT EXISTS public."SaleCatalogProfiles" (
    "Id" text PRIMARY KEY,
    "Name" text NOT NULL,
    "Category" text NOT NULL DEFAULT 'Bách hóa / Tiêu dùng',
    "IsBuiltin" boolean NOT NULL DEFAULT false,
    "Items" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
    "OwnerId" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index tra cứu theo phân loại và chủ sở hữu
CREATE INDEX IF NOT EXISTS "idx_sale_catalog_owner" ON public."SaleCatalogProfiles" ("OwnerId");
CREATE INDEX IF NOT EXISTS "idx_sale_catalog_category" ON public."SaleCatalogProfiles" ("Category");

-- Bật Row Level Security
ALTER TABLE public."SaleCatalogProfiles" ENABLE ROW LEVEL SECURITY;

-- Drop policy cũ nếu có
DROP POLICY IF EXISTS "sale_catalog_select" ON public."SaleCatalogProfiles";
DROP POLICY IF EXISTS "sale_catalog_all_access" ON public."SaleCatalogProfiles";

-- Policy cho phép đọc mẫu chuẩn, mẫu của chính mình hoặc quyền truy cập đầy đủ
CREATE POLICY "sale_catalog_all_access" ON public."SaleCatalogProfiles"
    FOR ALL
    TO public, authenticated
    USING (true)
    WITH CHECK (true);
