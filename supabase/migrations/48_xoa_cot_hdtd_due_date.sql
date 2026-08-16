-- Xoá cột chết LoanContracts."HdtdDueDate".
--
-- VÌ SAO XOÁ: đo ngày 16/08/2026 trên 103 KUNN thì cột này RỖNG TOÀN BỘ —
-- không một dòng nào có giá trị. Mã nguồn vẫn đọc nó làm đường dự phòng cho
-- ngày đáo hạn HĐTD ở creditLimit.ts và DashboardView, tức là dự phòng vào
-- một cột không bao giờ có dữ liệu. Migration 19 đã ghi nhận đúng chuyện này
-- từ 05/08/2026 ("phòng chưa khai ContractEndDate thì đọc HdtdDueDate coi như
-- chết") nhưng chưa xoá.
--
-- KHÔNG ĐỘNG tới ContractStartDate / ContractEndDate của LoanContracts trong
-- migration này. Hai cột đó là bản sao ngày hiệu lực HĐTD và vẫn đang là lưới
-- an toàn khi tra không ra hợp đồng cha — có test khoá hành vi đó. Việc bỏ
-- chúng cần chốt trước hai dòng dữ liệu bất thường, xem reports/10.
--
-- CHẠY MIGRATION NÀY TRƯỚC KHI DEPLOY bản mã đã gỡ HdtdDueDate.

BEGIN;

-- Chốt lại: nếu còn dòng nào có giá trị thì dừng, đừng xoá mù.
DO $$
DECLARE
  con_du_lieu bigint;
BEGIN
  SELECT count(*) INTO con_du_lieu
    FROM public."LoanContracts"
   WHERE "HdtdDueDate" IS NOT NULL;

  IF con_du_lieu > 0 THEN
    RAISE EXCEPTION
      'Còn % dòng có HdtdDueDate. Rà lại trước khi xoá cột, xem reports/10_ban_sao_ngay_hdtd_trong_kunn.sql',
      con_du_lieu;
  END IF;
END $$;

ALTER TABLE public."LoanContracts" DROP COLUMN IF EXISTS "HdtdDueDate";

COMMIT;
