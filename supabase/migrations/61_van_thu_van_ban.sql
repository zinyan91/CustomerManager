-- =====================================================================
-- Migration 61: Văn thư dạng danh mục văn bản (OfficialDocuments)
-- =====================================================================
-- Mỗi dòng là một văn bản. Tệp không nằm ở đây: cột Files chỉ giữ đường dẫn tới
-- tệp trong Kho lưu trữ (Hugging Face): [{kind, repoId, path, name}].
-- Tình trạng (Chưa hiệu lực / Hiện hành / Hết hiệu lực) KHÔNG lưu, tính sống từ
-- EffectiveFrom / EffectiveTo. SearchText do ứng dụng tính (số hiệu + tiêu đề,
-- chữ thường, bỏ dấu) để tìm không dấu bằng ilike.
-- Bảng "Dispatches" (migration 59/60) không còn được dùng và không bị đụng tới.
--
-- ÁP DỤNG: sau migration 60, TRƯỚC khi deploy mã mới.
-- Không phụ thuộc extension nào.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."OfficialDocuments" (
  "Id"            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "OwnerId"       uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  "Category"      text NOT NULL
                  CONSTRAINT ck_officialdocs_category
                  CHECK ("Category" IN ('van-ban', 'hop-dong', 'cong-van', 'khac')),
  "DocNumber"     text NOT NULL,
  "Title"         text NOT NULL,
  "DocType"       text NOT NULL
                  CONSTRAINT ck_officialdocs_doctype
                  CHECK ("DocType" IN (
                    'san-pham', 'dieu-le', 'chinh-sach-quy-che', 'chien-luoc',
                    'quy-dinh-san-pham', 'bo-tieu-chuan', 'quy-trinh-loi', 'quy-trinh',
                    'quy-dinh', 'the-le', 'huong-dan', 'so-tay-cam-nang',
                    'thong-bao', 'cong-van', 'khac'
                  )),
  "IssuedDate"    date NOT NULL,
  "EffectiveFrom" date NOT NULL,
  "EffectiveTo"   date,
  "Files"         jsonb NOT NULL DEFAULT '[]'::jsonb
                  CONSTRAINT ck_officialdocs_files_array CHECK (jsonb_typeof("Files") = 'array'),
  "SearchText"    text NOT NULL DEFAULT '',
  "CreatedAt"     timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_officialdocs_effective_range
    CHECK ("EffectiveTo" IS NULL OR "EffectiveTo" >= "EffectiveFrom")
);

COMMENT ON TABLE public."OfficialDocuments" IS
  'Danh mục văn bản Văn thư. Tệp là liên kết tới Kho lưu trữ (Hugging Face), không lưu nhị phân.';
COMMENT ON COLUMN public."OfficialDocuments"."Files" IS
  'Mảng JSON [{kind: goc|bieu-mau, repoId, path, name}] trỏ tới tệp trong Kho lưu trữ.';
COMMENT ON COLUMN public."OfficialDocuments"."SearchText" IS
  'Số hiệu + tiêu đề đã chuẩn hóa không dấu, chữ thường; ứng dụng tính khi lưu.';

CREATE INDEX IF NOT EXISTS idx_officialdocs_category_issued
  ON public."OfficialDocuments" ("Category", "IssuedDate" DESC);
CREATE INDEX IF NOT EXISTS idx_officialdocs_doctype
  ON public."OfficialDocuments" ("DocType");
CREATE INDEX IF NOT EXISTS idx_officialdocs_issued
  ON public."OfficialDocuments" ("IssuedDate" DESC, "Id" DESC);

ALTER TABLE public."OfficialDocuments" ENABLE ROW LEVEL SECURITY;

-- Mọi tài khoản đăng nhập đọc được; chỉ Master Admin và User Admin ghi.
DROP POLICY IF EXISTS "officialdocs_select" ON public."OfficialDocuments";
CREATE POLICY "officialdocs_select" ON public."OfficialDocuments"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "officialdocs_insert" ON public."OfficialDocuments";
CREATE POLICY "officialdocs_insert" ON public."OfficialDocuments"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "officialdocs_update" ON public."OfficialDocuments";
CREATE POLICY "officialdocs_update" ON public."OfficialDocuments"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "officialdocs_delete" ON public."OfficialDocuments";
CREATE POLICY "officialdocs_delete" ON public."OfficialDocuments"
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public."OfficialDocuments" FROM anon;
