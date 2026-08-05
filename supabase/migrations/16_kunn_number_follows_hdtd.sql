-- =====================================================================
-- Đổi tiền tố số KUNN theo số HĐTD hiện hành
-- =====================================================================
-- Số KUNN được đặt theo dạng <số HĐTD>/GNN-<nn>. Trước khi HĐTD thành thực
-- thể riêng (migration 14), số HĐTD chỉ là chuỗi suy ra từ chính số KUNN,
-- nên dữ liệu cũ còn những KUNN mang nhãn tạm: HĐTD-01/GNN-01,
-- HĐTD-02/GNN-01. Sửa số bên HĐTD không kéo theo số KUNN.
--
-- Giao diện đã đọc số HĐTD gốc từ HĐTD liên kết (resolveMasterHdtdNumber),
-- nên cột và bộ lọc hiện đúng. Script này sửa nốt SỐ HIỆU của bản thân KUNN.
--
-- ĐÂY LÀ SCRIPT SỬA SỐ HIỆU CHỨNG TỪ. Chạy tuần tự từng bước, đọc kết quả
-- bước rà soát trước khi chạy bước cập nhật. An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT: những KUNN sẽ bị đổi số
-- ---------------------------------------------------------------------
-- Chạy riêng bước này trước. Không có dòng nào trả về nghĩa là dữ liệu đã
-- khớp, không cần chạy tiếp.

SELECT
  lc."Id",
  c."FullName"                                        AS khach_hang,
  lc."ContractNumber"                                 AS so_kunn_hien_tai,
  cc."HdtdNumber"                                     AS so_hdtd_hien_hanh,
  cc."HdtdNumber" || '/GNN-'
    || split_part(lc."ContractNumber", '/GNN-', 2)    AS so_kunn_moi
FROM public."LoanContracts" lc
JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE lc."ContractNumber" LIKE '%/GNN-%'
  AND btrim(cc."HdtdNumber") <> ''
  AND split_part(lc."ContractNumber", '/GNN-', 1) <> btrim(cc."HdtdNumber")
ORDER BY khach_hang, lc."ContractNumber";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — CHỐT AN TOÀN: số mới có bị trùng với KUNN đang có không
-- ---------------------------------------------------------------------
-- Phải trả về 0 dòng. Có dòng nghĩa là đổi số sẽ tạo hai KUNN cùng số
-- hiệu — DỪNG LẠI, xử lý tay từng trường hợp rồi mới chạy bước 3.

WITH doi_so AS (
  SELECT
    lc."Id",
    lc."CustomerId",
    btrim(cc."HdtdNumber") || '/GNN-'
      || split_part(lc."ContractNumber", '/GNN-', 2) AS so_moi
  FROM public."LoanContracts" lc
  JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
  WHERE lc."ContractNumber" LIKE '%/GNN-%'
    AND btrim(cc."HdtdNumber") <> ''
    AND split_part(lc."ContractNumber", '/GNN-', 1) <> btrim(cc."HdtdNumber")
)
dem_trung AS (
  SELECT d.*, count(*) OVER (PARTITION BY d."CustomerId", lower(d.so_moi)) AS so_lan
  FROM doi_so d
)
SELECT d."Id", d.so_moi, 'trùng số với KUNN Id ' || k."Id" AS canh_bao
FROM doi_so d
JOIN public."LoanContracts" k
  ON k."CustomerId" = d."CustomerId"
 AND k."Id" <> d."Id"
 AND lower(btrim(k."ContractNumber")) = lower(d.so_moi)
UNION ALL
SELECT t."Id", t.so_moi, 'hai KUNN cùng ra một số mới' AS canh_bao
FROM dem_trung t
WHERE t.so_lan > 1;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — SAO LƯU số hiệu cũ
-- ---------------------------------------------------------------------
-- Giữ lại để đối chiếu hồ sơ giấy. Xoá bảng này sau khi chạy ổn vài ngày.

CREATE TABLE IF NOT EXISTS public."_backup_KunnNumbers_20260805" (
  "Id" integer PRIMARY KEY,
  "ContractNumber" text,
  "CreditContractId" integer,
  "SavedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_KunnNumbers_20260805" ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_KunnNumbers_20260805" ("Id", "ContractNumber", "CreditContractId")
SELECT lc."Id", lc."ContractNumber", lc."CreditContractId"
FROM public."LoanContracts" lc
JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
WHERE lc."ContractNumber" LIKE '%/GNN-%'
  AND btrim(cc."HdtdNumber") <> ''
  AND split_part(lc."ContractNumber", '/GNN-', 1) <> btrim(cc."HdtdNumber")
ON CONFLICT ("Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 4 — CẬP NHẬT
-- ---------------------------------------------------------------------
-- Chỉ đổi phần tiền tố, giữ nguyên số thứ tự GNN. Không đụng tới KUNN
-- chưa liên kết HĐTD và KUNN có tiền tố đã khớp.

UPDATE public."LoanContracts" lc
SET "ContractNumber" = btrim(cc."HdtdNumber") || '/GNN-'
                       || split_part(lc."ContractNumber", '/GNN-', 2)
FROM public."CreditContracts" cc
WHERE cc."Id" = lc."CreditContractId"
  AND lc."ContractNumber" LIKE '%/GNN-%'
  AND btrim(cc."HdtdNumber") <> ''
  AND split_part(lc."ContractNumber", '/GNN-', 1) <> btrim(cc."HdtdNumber");


-- ---------------------------------------------------------------------
-- BƯỚC 5 — DỌN NHÃN HĐTD CÒN SÓT TRONG Note
-- ---------------------------------------------------------------------
-- Dòng "HĐTD: ..." trong Note là tàn dư thời chưa có bảng HĐTD, và
-- getMasterHdtdNumber vẫn đọc nó trước cả tiền tố. Còn để lại thì KUNN nào
-- không liên kết HĐTD sẽ tiếp tục hiện nhãn cũ.

UPDATE public."LoanContracts"
SET "Note" = btrim(regexp_replace("Note", '(^|\n)HĐTD:[^\n]*\n?', '\1', 'g'))
WHERE "Note" LIKE '%HĐTD:%'
  AND "CreditContractId" IS NOT NULL;


-- ---------------------------------------------------------------------
-- BƯỚC 6 — KIỂM CHỨNG SAU KHI CHẠY
-- ---------------------------------------------------------------------
-- Câu 1 phải trả về 0 dòng. Câu 2 để mắt đối chiếu.

SELECT count(*) AS con_lech
FROM public."LoanContracts" lc
JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
WHERE lc."ContractNumber" LIKE '%/GNN-%'
  AND btrim(cc."HdtdNumber") <> ''
  AND split_part(lc."ContractNumber", '/GNN-', 1) <> btrim(cc."HdtdNumber");

SELECT b."Id", b."ContractNumber" AS so_cu, lc."ContractNumber" AS so_moi
FROM public."_backup_KunnNumbers_20260805" b
JOIN public."LoanContracts" lc ON lc."Id" = b."Id"
ORDER BY b."Id";
