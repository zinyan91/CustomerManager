-- =====================================================================
-- Migration 59: Quản lý văn thư & Hồ sơ lưu trữ (Dispatches / Archive)
-- =====================================================================
-- Bảng Dispatches lưu trữ metadata của các văn bản hành chính, quyết định,
-- thông báo, biên bản định giá, tờ trình, hợp đồng pháp lý trong hệ thống
-- CustomerManager.
-- File nhị phân (binary objects) được lưu trữ song song trên Cloudflare R2
-- hoặc Supabase Storage / Local IndexedDB theo chuẩn Dual-Storage.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."Dispatches" (
  "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "OwnerId" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "DocumentNumber" text,
  "Title" text NOT NULL,
  "DocumentType" text NOT NULL DEFAULT 'khac',
  "Issuer" text,
  "DocumentDate" date,
  "ReceivedDate" date,
  "CustomerId" bigint REFERENCES public."Customers"("Id") ON DELETE SET NULL,
  "FileName" text NOT NULL,
  "FileSize" bigint NOT NULL DEFAULT 0,
  "FileType" text NOT NULL DEFAULT 'application/octet-stream',
  "FileUrl" text NOT NULL,
  "StorageProvider" text NOT NULL DEFAULT 'local',
  "AiSummary" text,
  "AiKeywords" text[],
  "Note" text,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."Dispatches" IS
  'Quản lý công văn, quyết định, thông báo, tờ trình và hồ sơ văn thư lưu trữ.';

CREATE INDEX IF NOT EXISTS idx_dispatches_customer_id
  ON public."Dispatches" ("CustomerId")
  WHERE "CustomerId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatches_document_type
  ON public."Dispatches" ("DocumentType");

CREATE INDEX IF NOT EXISTS idx_dispatches_document_date
  ON public."Dispatches" ("DocumentDate");

ALTER TABLE public."Dispatches" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatches_select_all" ON public."Dispatches"
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Dispatches_insert_all" ON public."Dispatches"
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Dispatches_update_all" ON public."Dispatches"
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Dispatches_delete_all" ON public."Dispatches"
  FOR DELETE TO authenticated, anon USING (true);
