-- =====================================================================
-- Khai lại RepaymentStartDate theo GNN giấy — nhóm hạn mức
-- =====================================================================
-- Quyết định nghiệp vụ 05/08/2026 (PROGRESS.md): ngày thu lãi hàng tháng
-- của hợp đồng hạn mức là THEO LỰA CHỌN CỦA TỪNG KHÁCH HÀNG, khai trên
-- từng KUNN — không suy được từ ngày giải ngân, không gom chung theo HĐTD.
-- RepaymentStartDate là DỮ LIỆU GỐC phải khai đúng GNN giấy (CONVENTIONS.md §2).
--
-- Rà soát 05/08/2026 (kết quả bị giới hạn 10 dòng do row limit của editor)
-- đã phân loại được ba nhóm sai:
--
--   1. "sai chắc chắn"       — RepaymentStartDate <= DisbursementDate.
--      Không thể đúng: kỳ 1 phải SAU ngày giải ngân (CONVENTIONS.md §2).
--      NGÔ NHỊ ĐẠT (Id 1047–1051), PHẠM NGỌC CẢNH (Id 1083).
--
--   2. "nghi mượn mốc hợp đồng" — ngày trong tháng của RepaymentStartDate
--      trùng với ContractStartDate của HĐTD, không trùng logic khách chọn.
--      PHAN THÚC BẢO (Id 1092), TRẦN MINH HIẾU (Id 1093).
--
--   3. "chưa khai" — RepaymentStartDate NULL, lịch đang chạy mặc định
--      giải ngân + 1 tháng, là giá trị TẠM chờ khai theo chứng từ.
--      NGUYỄN VƯƠNG VŨ (Id 1073), TRẦN THỊ KIM CHI (Id 1095).
--
-- ĐÂY LÀ SCRIPT SỬA DỮ LIỆU GỐC. Chạy tuần tự, đối chiếu GNN giấy trước khi
-- điền bất kỳ ngày nào ở BƯỚC 3. Không suy đoán, không copy giá trị của
-- KUNN khác trong cùng hợp đồng — đó chính là lỗi đã sinh ra vụ việc này.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT ĐẦY ĐỦ (không giới hạn dòng)
-- ---------------------------------------------------------------------
-- Chạy PHẦN 5 của supabase/reports/01_thu_vuot_ky_dau.sql, KHÔNG đặt row
-- limit trên editor. Lần rà soát trước hiển thị "10 rows (Limited to only
-- 10...)" — con số 10 dòng trong phần mô tả trên có thể còn sót dòng.
-- Không chép lại câu SQL ở đây để tránh hai bản trôi dạt (CONVENTIONS.md §1).


-- ---------------------------------------------------------------------
-- BƯỚC 2 — SAO LƯU trước khi sửa
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."_backup_RepaymentStartDate_20260805" (
  "Id" integer PRIMARY KEY,
  "RepaymentStartDate" date,
  "SavedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_RepaymentStartDate_20260805" ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_RepaymentStartDate_20260805" ("Id", "RepaymentStartDate")
SELECT "Id", "RepaymentStartDate"
FROM public."LoanContracts"
ON CONFLICT ("Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — SỬA THEO GNN GIẤY (thủ công, cố tình để dạng mẫu)
-- ---------------------------------------------------------------------
-- Bỏ dấu chú thích và điền ngày đúng GNN giấy cho từng dòng. Không tự suy,
-- không copy từ KUNN khác. Nếu BƯỚC 1 tìm ra dòng nào ngoài danh sách dưới,
-- thêm UPDATE tương ứng — đừng bỏ sót vì không có sẵn mẫu.

-- NGÔ NHỊ ĐẠT — 2002/HĐTD/9632774/GNN-07..11 — nhóm đã gây thu vượt 21,7tr
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1047;
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1048;
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1049;
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1050;
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1051;

-- PHẠM NGỌC CẢNH — GNN-14
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-05-15' WHERE "Id" = 1083;

-- PHAN THÚC BẢO — GNN-03
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-07-15' WHERE "Id" = 1092;

-- TRẦN MINH HIẾU — GNN-01 — giải ngân 16/06/2025, xác nhận 05/08/2026: 15/07/2025
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2025-07-15' WHERE "Id" = 1093;

-- NGUYỄN VƯƠNG VŨ — GNN-17
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2026-07-15' WHERE "Id" = 1073;

-- TRẦN THỊ KIM CHI — GNN-01
-- UPDATE public."LoanContracts" SET "RepaymentStartDate" = '2025-03-15' WHERE "Id" = 1095;


-- ---------------------------------------------------------------------
-- BƯỚC 4 — KIỂM CHỨNG SAU KHI SỬA
-- ---------------------------------------------------------------------
-- Chạy lại BƯỚC 1: các dòng đã sửa không còn xuất hiện, chỉ còn dòng chưa
-- xử lý (nếu cố tình để lại) hoặc 0 dòng nếu đã sửa hết.
