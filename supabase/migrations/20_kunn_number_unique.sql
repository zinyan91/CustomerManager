-- =====================================================================
-- Chống trùng số hiệu KUNN
-- =====================================================================
-- Rà soát 05/08/2026 tìm thấy các cặp KUNN mang cùng một số hiệu:
-- Id 1027 & 1068; 1036–1038; 1005–1007 (ba dòng này còn thiếu cả phần
-- '/GNN-'). Số hiệu KUNN là SỐ CHỨNG TỪ — trùng số là hai giấy nhận nợ khác
-- nhau cùng mang một số, không đối chiếu được với hồ sơ giấy và không truy
-- được nghĩa vụ về đúng khoản vay.
--
-- Hai nguyên nhân đã xác định:
--
--   1. nextKunnNumber được gọi lúc MỞ FORM, số sinh ra không kiểm tra lại
--      lúc lưu. Tạo hai KUNN liên tiếp trong cùng một phiên, hoặc hai người
--      cùng nhập một HĐTD, đều ra cùng một số. Mã nguồn đã bổ sung bước kiểm
--      tra lại lúc lưu (assertKunnNumberFree trong src/lib/api.ts).
--
--   2. Migration 16 BƯỚC 2 — đúng bước chốt an toàn "số mới có trùng số cũ
--      không" — thiếu dấu phẩy giữa hai CTE (`) dem_trung AS (`), nên câu đó
--      LUÔN lỗi cú pháp và chưa bao giờ chạy. Bước 4 đổi tiền tố vẫn chạy.
--      Đây là đường sinh ra phần lớn các cặp trùng ở trên.
--
-- Bước kiểm tra ở client KHÔNG đủ: dưới RLS, banker chỉ nhìn thấy KUNN của
-- khách hàng mình, nên số do banker khác đã dùng là vô hình. Unique index
-- dưới database là lớp phòng thủ duy nhất và thực sự — cùng lý lẽ với RLS.
--
-- ĐÂY LÀ SCRIPT SỬA SỐ HIỆU CHỨNG TỪ. Chạy tuần tự, đọc kết quả bước rà soát
-- và xử lý hết trùng TRƯỚC khi chạy bước tạo index. An toàn khi chạy lại.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT: những số hiệu đang bị dùng nhiều hơn một lần
-- ---------------------------------------------------------------------
-- So sau khi btrim + lower: 'HD01/GNN-01' và 'hd01/gnn-01 ' là cùng một số
-- chứng từ, khác nhau chỉ vì cách gõ.
--
-- Không có dòng nào trả về nghĩa là dữ liệu đã sạch, nhảy tới BƯỚC 4.

WITH trung AS (
  SELECT lower(btrim("ContractNumber")) AS so_chuan
  FROM public."LoanContracts"
  WHERE btrim(coalesce("ContractNumber", '')) <> ''
  GROUP BY 1
  HAVING count(*) > 1
)
SELECT
  lc."Id",
  c."FullName"            AS khach_hang,
  lc."ContractNumber"     AS so_kunn,
  cc."HdtdNumber"         AS so_hdtd,
  lc."DisbursementDate"   AS ngay_giai_ngan,
  lc."LoanAmount"         AS so_tien_vay
FROM public."LoanContracts" lc
JOIN trung t ON t.so_chuan = lower(btrim(lc."ContractNumber"))
LEFT JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
ORDER BY lower(btrim(lc."ContractNumber")), lc."Id";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — RÀ SOÁT: KUNN thiếu hẳn phần '/GNN-'
-- ---------------------------------------------------------------------
-- Số KUNN đúng dạng là <số HĐTD>/GNN-<nn>. Dòng thiếu hậu tố đang mang đúng
-- số HĐTD, nên khi HĐTD đó có nhiều KUNN thì các dòng thiếu hậu tố trùng nhau
-- ngay. Cột `so_de_xuat` là số tiếp theo còn trống của HĐTD đó.
--
-- KHÔNG tự động áp số đề xuất. Số này phải khớp GNN giấy; đây là gợi ý để đối
-- chiếu chứng từ, không phải kết luận.

WITH da_dung AS (
  SELECT
    lc."CreditContractId",
    max(coalesce(nullif(split_part(lc."ContractNumber", '/GNN-', 2), '')::int, 0)) AS max_so
  FROM public."LoanContracts" lc
  WHERE lc."ContractNumber" LIKE '%/GNN-%'
    AND split_part(lc."ContractNumber", '/GNN-', 2) ~ '^\d+$'
  GROUP BY 1
)
SELECT
  lc."Id",
  c."FullName"          AS khach_hang,
  lc."ContractNumber"   AS so_kunn_hien_tai,
  cc."HdtdNumber"       AS so_hdtd,
  btrim(cc."HdtdNumber") || '/GNN-'
    || lpad((coalesce(d.max_so, 0)
             + row_number() OVER (PARTITION BY lc."CreditContractId"
                                  ORDER BY lc."DisbursementDate", lc."Id"))::text,
            2, '0')     AS so_de_xuat,
  lc."DisbursementDate" AS ngay_giai_ngan,
  lc."LoanAmount"       AS so_tien_vay
FROM public."LoanContracts" lc
JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
LEFT JOIN da_dung d ON d."CreditContractId" = lc."CreditContractId"
WHERE lc."ContractNumber" NOT LIKE '%/GNN-%'
ORDER BY khach_hang, lc."Id";


-- ---------------------------------------------------------------------
-- BƯỚC 3 — SỬA SỐ HIỆU (thủ công, sau khi đối chiếu GNN giấy)
-- ---------------------------------------------------------------------
-- Cố tình để dạng mẫu phải sửa tay. Số hiệu chứng từ không được máy đoán:
-- đặt lại số cho một GNN đang có nghĩa vụ chưa trả xong mà không khớp giấy
-- thì bản đối chiếu với hồ sơ và với core banking đều lệch.
--
-- Sao lưu trước, rồi UPDATE từng Id một. Bỏ dấu chú thích khi thực sự chạy.

CREATE TABLE IF NOT EXISTS public."_backup_KunnNumbers_20260805_dup" (
  "Id" integer PRIMARY KEY,
  "ContractNumber" text,
  "CreditContractId" integer,
  "SavedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_KunnNumbers_20260805_dup" ENABLE ROW LEVEL SECURITY;

-- INSERT INTO public."_backup_KunnNumbers_20260805_dup" ("Id", "ContractNumber", "CreditContractId")
-- SELECT "Id", "ContractNumber", "CreditContractId"
-- FROM public."LoanContracts"
-- WHERE "Id" IN (1005, 1006, 1007, 1027, 1036, 1037, 1038, 1068)
-- ON CONFLICT ("Id") DO NOTHING;

-- UPDATE public."LoanContracts" SET "ContractNumber" = '<số theo GNN giấy>' WHERE "Id" = 1005;
-- UPDATE public."LoanContracts" SET "ContractNumber" = '<số theo GNN giấy>' WHERE "Id" = 1006;
-- ...


-- ---------------------------------------------------------------------
-- BƯỚC 4 — UNIQUE INDEX
-- ---------------------------------------------------------------------
-- Chỉ chạy được khi BƯỚC 1 đã trả về 0 dòng. Lệnh này LỖI nếu còn trùng —
-- đó là hành vi mong muốn, không phải sự cố: không được im lặng bỏ qua.
--
-- Index trên biểu thức lower(btrim(...)) để chặn cả trùng do khác cách gõ.
-- Bỏ qua dòng có số rỗng: KUNN nháp chưa đặt số không phải trùng nhau.

CREATE UNIQUE INDEX IF NOT EXISTS "LoanContracts_ContractNumber_key"
  ON public."LoanContracts" (lower(btrim("ContractNumber")))
  WHERE btrim(coalesce("ContractNumber", '')) <> '';


-- ---------------------------------------------------------------------
-- BƯỚC 5 — KIỂM CHỨNG SAU KHI CHẠY
-- ---------------------------------------------------------------------
-- Câu 1 phải trả về 0 dòng. Câu 2 phải thấy index vừa tạo.

SELECT lower(btrim("ContractNumber")) AS so_chuan, count(*) AS so_dong
FROM public."LoanContracts"
WHERE btrim(coalesce("ContractNumber", '')) <> ''
GROUP BY 1
HAVING count(*) > 1;

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'LoanContracts'
  AND indexname = 'LoanContracts_ContractNumber_key';
