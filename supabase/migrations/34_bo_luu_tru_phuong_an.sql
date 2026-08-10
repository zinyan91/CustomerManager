-- =====================================================================
-- Bỏ lưu trữ phương án kinh doanh
-- =====================================================================
-- Quyết định nghiệp vụ 10/08/2026: bảng tính phương án là công cụ nhập
-- liệu cho TỜ TRÌNH, không phải hồ sơ tín dụng. Nó không gắn khách hàng,
-- không gắn HĐTD, và không cần lưu — banker nhập, xem kết quả, xuất ba
-- phụ lục rồi thôi.
--
-- Hệ quả: migration 31 dựng hai bảng này không còn chỗ dùng. Giữ lại là
-- để dữ liệu chết trong lược đồ, và tệ hơn: RLS của chúng suy theo
-- "Customers"."OwnerId", mà cột "CustomerId" thì không còn ai ghi vào.
--
-- Không có dữ liệu thật nào để mất: bản thử duy nhất đã xoá ngay trong
-- ngày 09/08/2026 (xem PROGRESS.md).
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ĐO TRƯỚC KHI XOÁ
-- ---------------------------------------------------------------------
-- Chạy riêng phần này trước. Nếu ra khác 0 thì DỪNG LẠI và hỏi trước khi
-- chạy tiếp: nghĩa là có người đã nhập dữ liệu thật vào đây.
SELECT
  (SELECT count(*) FROM public."BusinessPlans")     AS so_phuong_an,
  (SELECT count(*) FROM public."BusinessPlanDebts") AS so_dong_du_no;


-- ---------------------------------------------------------------------
-- 2. XOÁ
-- ---------------------------------------------------------------------
-- BusinessPlanDebts trỏ về BusinessPlans bằng khoá ngoại ON DELETE
-- CASCADE, nên xoá bảng cha trước sẽ vướng. Xoá bảng con trước.

DROP TABLE IF EXISTS public."BusinessPlanDebts";
DROP TABLE IF EXISTS public."BusinessPlans";

DROP FUNCTION IF EXISTS public.can_access_business_plan(integer);
DROP FUNCTION IF EXISTS public.touch_business_plan_updated_at();


-- ---------------------------------------------------------------------
-- 3. KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- (a) Hai bảng đã biến mất
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('BusinessPlans', 'BusinessPlanDebts');

-- (b) Hai hàm đã biến mất
SELECT proname FROM pg_proc
WHERE proname IN ('can_access_business_plan', 'touch_business_plan_updated_at');

-- (c) Không bảng nào còn hở RLS sau khi xoá
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
