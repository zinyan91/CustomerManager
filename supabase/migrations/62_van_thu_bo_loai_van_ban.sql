-- =====================================================================
-- Migration 62: Bỏ trường "Loại văn bản" khỏi Văn thư
-- =====================================================================
-- Ứng dụng không còn nhập, lọc hay hiển thị "Loại văn bản": mục Văn bản /
-- Hợp đồng / Công văn / Khác (cột "Category") đã đủ để phân loại.
-- Không xóa cột để không mất dữ liệu đã nhập; chỉ cho phép để trống (NULL),
-- nếu không mọi lần thêm văn bản mới sẽ lỗi vì cột còn NOT NULL.
--
-- ÁP DỤNG: sau migration 61, TRƯỚC khi deploy mã mới.
-- =====================================================================

ALTER TABLE public."OfficialDocuments"
  ALTER COLUMN "DocType" DROP NOT NULL;

COMMENT ON COLUMN public."OfficialDocuments"."DocType" IS
  'Không còn dùng (đã bỏ khỏi giao diện); giữ lại dữ liệu cũ.';
