-- =====================================================================
-- Migration 64: Kho Biểu mẫu (loại kho thứ tư của StorageRepos)
-- =====================================================================
-- Văn bản có hai nhóm tệp: "gốc" lấy từ kho Văn thư, "biểu mẫu" lấy từ kho Biểu mẫu.
-- Kho Biểu mẫu giống kho Văn thư: chỉ một kho, mọi tài khoản đăng nhập đều thấy trong danh sách.
-- Không phá huỷ: chỉ nới ràng buộc Kind và thêm index; dữ liệu cũ giữ nguyên.
--
-- ÁP DỤNG: TRƯỚC khi deploy mã mới (mã mới tạo repo Kind = 'form').
-- =====================================================================

ALTER TABLE public."StorageRepos" DROP CONSTRAINT IF EXISTS "StorageRepos_Kind_check";
ALTER TABLE public."StorageRepos"
  ADD CONSTRAINT "StorageRepos_Kind_check"
  CHECK ("Kind" IN ('shared', 'personal', 'dispatch', 'form'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_storagerepos_one_form
  ON public."StorageRepos" ("Kind") WHERE "Kind" = 'form';

DROP POLICY IF EXISTS "storagerepos_select" ON public."StorageRepos";
CREATE POLICY "storagerepos_select" ON public."StorageRepos"
  FOR SELECT TO authenticated
  USING (
    "Kind" IN ('shared', 'dispatch', 'form')
    OR "AssignedUserId" = auth.uid()
    OR public.is_admin()
  );
