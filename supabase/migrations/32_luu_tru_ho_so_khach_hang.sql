-- =====================================================================
-- Lưu trữ hồ sơ khách hàng
-- =====================================================================
-- Tab Khách hàng là DANH BẠ HỒ SƠ. Nó cố ý không nạp KUNN, HĐTD hay thẻ,
-- nên không thể tự nhận ra ai đã tất toán — và cũng không nên, vì kéo dư
-- nợ vào đó là biến nó thành bản sao của tab Khoản vay.
--
-- Vì vậy trạng thái này là THUỘC TÍNH CỦA CHÍNH HỒ SƠ do banker đánh dấu,
-- không phải số liệu suy ra từ dư nợ.
--
-- Gọi là "lưu trữ", KHÔNG gọi là "đã tất toán". Cờ do người gõ tay không
-- bảo đảm được điều gì về nợ; gắn nhãn "đã tất toán" lên nó là tạo nguồn
-- thứ hai mâu thuẫn với dư nợ thật — đúng lỗi mà `isKunnSettled` từng gây
-- ra khi suy trạng thái tất toán từ `IsClosed` của HĐTD.
--
-- MỘT cột duy nhất mang cả cờ lẫn ngày. Hai cột `IsArchived` + ngày lưu
-- trữ có thể mâu thuẫn nhau (cờ bật mà ngày rỗng, hoặc ngược lại).
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

ALTER TABLE public."Customers"
  ADD COLUMN IF NOT EXISTS "ArchivedAt" timestamptz;

COMMENT ON COLUMN public."Customers"."ArchivedAt" IS
  'Thời điểm banker lưu trữ hồ sơ. NULL nghĩa là đang làm việc. Đây KHÔNG phải trạng thái tất toán nợ — dư nợ thật đọc từ LoanContracts và RepaymentSchedules.';

CREATE INDEX IF NOT EXISTS idx_customers_archived
  ON public."Customers" ("ArchivedAt")
  WHERE "ArchivedAt" IS NOT NULL;


-- ---------------------------------------------------------------------
-- KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- (a) Cột đã có, đúng kiểu, cho phép NULL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Customers' AND column_name = 'ArchivedAt';

-- (b) Chưa hồ sơ nào bị lưu trữ ngay sau khi chạy
SELECT count(*) FILTER (WHERE "ArchivedAt" IS NULL)     AS dang_lam_viec,
       count(*) FILTER (WHERE "ArchivedAt" IS NOT NULL) AS da_luu_tru
FROM public."Customers";

-- (c) Đối chiếu về sau: hồ sơ đã lưu trữ mà vẫn còn KUNN chưa tất toán.
--     Chốt trong api.ts tự bỏ cờ khi ghi hợp đồng mới, nhưng dữ liệu nhập
--     thẳng bằng SQL thì không đi qua đó — câu này để rà lại định kỳ.
-- SELECT c."CifKh", c."FullName", c."ArchivedAt",
--        count(*) FILTER (WHERE coalesce(k."IsSettled", false) = false) AS kunn_chua_tat_toan
-- FROM public."Customers" c
-- JOIN public."LoanContracts" k ON k."CustomerId" = c."Id"
-- WHERE c."ArchivedAt" IS NOT NULL
-- GROUP BY c."Id", c."CifKh", c."FullName", c."ArchivedAt"
-- HAVING count(*) FILTER (WHERE coalesce(k."IsSettled", false) = false) > 0;
