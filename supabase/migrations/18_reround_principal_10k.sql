-- =====================================================================
-- Làm tròn lại gốc các kỳ CHƯA THANH TOÁN theo bước 10.000đ
-- =====================================================================
-- Đối chiếu giấy nhận nợ thật (PNAT.CN.03111223/GNN-01, 500.000.000đ / 120 kỳ):
-- chứng từ ghi 4.170.000đ/kỳ, kỳ cuối 3.770.000đ — tức làm tròn LÊN bước
-- 10.000. Lịch cũ trong database sinh theo bước 1.000 nên ra 4.167.000đ, lệch
-- mọi kỳ so với bản khách đang giữ. Code đã đổi sang bước 10.000 (migration này
-- chỉ sửa dữ liệu cũ).
--
-- NGUYÊN TẮC AN TOÀN của script:
--   · CHỈ sửa các kỳ CHƯA thanh toán. Kỳ đã trả giữ nguyên — sửa số của kỳ đã
--     trả sẽ làm lệch với số tiền khách đã nộp thật.
--   · Giữ bất biến Σ(gốc các kỳ) = số tiền vay: phần gốc còn lại chia đều theo
--     bước 10.000, KỲ CHƯA TRẢ CUỐI CÙNG gánh phần dư.
--   · KHÔNG đụng vào: khoản gốc trả cuối kỳ (bullet), khoản có gốc trả lẻ đang
--     treo trên kỳ chưa trả, khoản đã tất toán hết các kỳ, và khoản mà phép
--     chia ra kỳ cuối âm. Bước 2 liệt kê riêng để xử lý tay.
--
-- Tiền LÃI của các kỳ chưa trả KHÔNG được tính lại ở đây: lãi phụ thuộc dư nợ và
-- số ngày thực tế từng kỳ, tính lại đúng thì phải qua recalculateSchedules trong
-- app. Chênh lệch do gốc lệch tối đa 10.000đ nên lãi lệch cỡ vài trăm đồng/kỳ.
-- Muốn khớp tuyệt đối thì sau khi chạy script, mở từng khoản trong app và lưu
-- lại một lần để app tính lại lãi.
--
-- Chạy tuần tự từng bước. An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT: khoản nào sẽ bị sửa, sửa bao nhiêu kỳ
-- ---------------------------------------------------------------------

WITH base AS (
  SELECT
    lc."Id"                                   AS contract_id,
    lc."ContractNumber",
    lc."PrincipalRepaymentMethod",
    coalesce(lc."LoanAmount", lc."ContractAmount", 0)                                    AS loan_amt,
    coalesce(sum(rs."PrincipalAmount") FILTER (WHERE rs."IsPaid"), 0)                    AS goc_da_tra,
    count(*) FILTER (WHERE NOT rs."IsPaid")                                              AS so_ky_chua_tra,
    max(rs."PeriodNumber") FILTER (WHERE NOT rs."IsPaid")                                AS ky_chua_tra_cuoi,
    coalesce(sum(coalesce(rs."ActualPaidPrincipal", 0)
               + coalesce(rs."PrepaidPrincipalAmount", 0))
             FILTER (WHERE NOT rs."IsPaid"), 0)                                          AS goc_tra_le
  FROM public."LoanContracts" lc
  JOIN public."RepaymentSchedules" rs ON rs."ContractId" = lc."Id"
  GROUP BY lc."Id", lc."ContractNumber", lc."PrincipalRepaymentMethod",
           lc."LoanAmount", lc."ContractAmount"
),
plan AS (
  SELECT b.*,
    (b.loan_amt - b.goc_da_tra)                                                          AS goc_con_lai,
    ceil((b.loan_amt - b.goc_da_tra) / b.so_ky_chua_tra / 10000) * 10000                 AS goc_moi_ky,
    (b.loan_amt - b.goc_da_tra)
      - ceil((b.loan_amt - b.goc_da_tra) / b.so_ky_chua_tra / 10000) * 10000
        * (b.so_ky_chua_tra - 1)                                                         AS goc_ky_cuoi
  FROM base b
  WHERE b.so_ky_chua_tra > 0
    AND b.goc_tra_le = 0
    AND coalesce(b."PrincipalRepaymentMethod", 'Gốc trả cuối kỳ') <> 'Gốc trả cuối kỳ'
    AND (b.loan_amt - b.goc_da_tra) > 0
)
SELECT p.contract_id, p."ContractNumber", c."FullName" AS khach_hang,
       p.loan_amt, p.goc_con_lai, p.so_ky_chua_tra,
       p.goc_moi_ky, p.goc_ky_cuoi,
       count(*) FILTER (WHERE rs."PrincipalAmount" <> CASE
         WHEN rs."PeriodNumber" = p.ky_chua_tra_cuoi THEN p.goc_ky_cuoi ELSE p.goc_moi_ky END) AS so_ky_se_sua
FROM plan p
JOIN public."RepaymentSchedules" rs ON rs."ContractId" = p.contract_id AND NOT rs."IsPaid"
LEFT JOIN public."LoanContracts" lc ON lc."Id" = p.contract_id
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE p.goc_ky_cuoi >= 0
GROUP BY p.contract_id, p."ContractNumber", c."FullName", p.loan_amt, p.goc_con_lai,
         p.so_ky_chua_tra, p.goc_moi_ky, p.goc_ky_cuoi
HAVING count(*) FILTER (WHERE rs."PrincipalAmount" <> CASE
         WHEN rs."PeriodNumber" = p.ky_chua_tra_cuoi THEN p.goc_ky_cuoi ELSE p.goc_moi_ky END) > 0
ORDER BY khach_hang, p."ContractNumber";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — DANH SÁCH BỊ LOẠI, phải xem tay
-- ---------------------------------------------------------------------
-- Script không tự sửa những khoản này. Đọc cột `ly_do` để biết vì sao.

WITH base AS (
  SELECT
    lc."Id" AS contract_id, lc."ContractNumber", lc."CustomerId",
    lc."PrincipalRepaymentMethod",
    coalesce(lc."LoanAmount", lc."ContractAmount", 0) AS loan_amt,
    coalesce(sum(rs."PrincipalAmount") FILTER (WHERE rs."IsPaid"), 0) AS goc_da_tra,
    count(*) FILTER (WHERE NOT rs."IsPaid") AS so_ky_chua_tra,
    coalesce(sum(coalesce(rs."ActualPaidPrincipal", 0)
               + coalesce(rs."PrepaidPrincipalAmount", 0))
             FILTER (WHERE NOT rs."IsPaid"), 0) AS goc_tra_le
  FROM public."LoanContracts" lc
  JOIN public."RepaymentSchedules" rs ON rs."ContractId" = lc."Id"
  GROUP BY lc."Id", lc."ContractNumber", lc."CustomerId", lc."PrincipalRepaymentMethod",
           lc."LoanAmount", lc."ContractAmount"
)
SELECT b.contract_id, b."ContractNumber", c."FullName" AS khach_hang,
  CASE
    WHEN coalesce(b."PrincipalRepaymentMethod", 'Gốc trả cuối kỳ') = 'Gốc trả cuối kỳ'
      THEN 'gốc trả cuối kỳ — không chia đều nên không có gì để làm tròn'
    WHEN b.so_ky_chua_tra = 0 THEN 'đã thanh toán hết các kỳ'
    WHEN b.goc_tra_le > 0
      THEN 'có gốc trả lẻ ' || b.goc_tra_le || 'đ treo trên kỳ chưa trả — chia lại sẽ làm lệch bút toán đó'
    WHEN (b.loan_amt - b.goc_da_tra) <= 0 THEN 'gốc đã trả >= số tiền vay, dữ liệu cần soát riêng'
    ELSE 'kỳ chưa trả cuối cùng bị âm sau khi làm tròn — gốc mỗi kỳ quá nhỏ so với số kỳ'
  END AS ly_do
FROM base b
LEFT JOIN public."Customers" c ON c."Id" = b."CustomerId"
WHERE coalesce(b."PrincipalRepaymentMethod", 'Gốc trả cuối kỳ') = 'Gốc trả cuối kỳ'
   OR b.so_ky_chua_tra = 0
   OR b.goc_tra_le > 0
   OR (b.loan_amt - b.goc_da_tra) <= 0
   OR (b.loan_amt - b.goc_da_tra)
        - ceil((b.loan_amt - b.goc_da_tra) / greatest(b.so_ky_chua_tra, 1) / 10000) * 10000
          * (greatest(b.so_ky_chua_tra, 1) - 1) < 0
ORDER BY khach_hang, b."ContractNumber";


-- ---------------------------------------------------------------------
-- BƯỚC 3 — SAO LƯU các dòng lịch sẽ bị sửa
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."_backup_SchedulePrincipal_20260805" (
  "Id" integer PRIMARY KEY,
  "ContractId" integer,
  "PeriodNumber" integer,
  "PrincipalAmount" numeric,
  "TotalAmount" numeric,
  "SavedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_SchedulePrincipal_20260805" ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_SchedulePrincipal_20260805"
  ("Id", "ContractId", "PeriodNumber", "PrincipalAmount", "TotalAmount")
SELECT rs."Id", rs."ContractId", rs."PeriodNumber", rs."PrincipalAmount", rs."TotalAmount"
FROM public."RepaymentSchedules" rs
WHERE NOT rs."IsPaid"
ON CONFLICT ("Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 4 — CẬP NHẬT
-- ---------------------------------------------------------------------

WITH base AS (
  SELECT
    lc."Id" AS contract_id,
    lc."PrincipalRepaymentMethod",
    coalesce(lc."LoanAmount", lc."ContractAmount", 0) AS loan_amt,
    coalesce(sum(rs."PrincipalAmount") FILTER (WHERE rs."IsPaid"), 0) AS goc_da_tra,
    count(*) FILTER (WHERE NOT rs."IsPaid") AS so_ky_chua_tra,
    max(rs."PeriodNumber") FILTER (WHERE NOT rs."IsPaid") AS ky_chua_tra_cuoi,
    coalesce(sum(coalesce(rs."ActualPaidPrincipal", 0)
               + coalesce(rs."PrepaidPrincipalAmount", 0))
             FILTER (WHERE NOT rs."IsPaid"), 0) AS goc_tra_le
  FROM public."LoanContracts" lc
  JOIN public."RepaymentSchedules" rs ON rs."ContractId" = lc."Id"
  GROUP BY lc."Id", lc."PrincipalRepaymentMethod", lc."LoanAmount", lc."ContractAmount"
),
plan AS (
  SELECT b.*,
    ceil((b.loan_amt - b.goc_da_tra) / b.so_ky_chua_tra / 10000) * 10000 AS goc_moi_ky,
    (b.loan_amt - b.goc_da_tra)
      - ceil((b.loan_amt - b.goc_da_tra) / b.so_ky_chua_tra / 10000) * 10000
        * (b.so_ky_chua_tra - 1) AS goc_ky_cuoi
  FROM base b
  WHERE b.so_ky_chua_tra > 0
    AND b.goc_tra_le = 0
    AND coalesce(b."PrincipalRepaymentMethod", 'Gốc trả cuối kỳ') <> 'Gốc trả cuối kỳ'
    AND (b.loan_amt - b.goc_da_tra) > 0
)
UPDATE public."RepaymentSchedules" rs
SET "PrincipalAmount" = v.goc_moi,
    "TotalAmount" = v.goc_moi
                    + coalesce(rs."InterestAmount", 0)
                    + coalesce(rs."OverdueInterestAmount", 0)
FROM (
  SELECT p.contract_id, p.ky_chua_tra_cuoi, p.goc_moi_ky, p.goc_ky_cuoi,
         s."Id" AS sched_id,
         CASE WHEN s."PeriodNumber" = p.ky_chua_tra_cuoi THEN p.goc_ky_cuoi ELSE p.goc_moi_ky END AS goc_moi
  FROM plan p
  JOIN public."RepaymentSchedules" s ON s."ContractId" = p.contract_id AND NOT s."IsPaid"
  WHERE p.goc_ky_cuoi >= 0
) v
WHERE rs."Id" = v.sched_id
  AND rs."PrincipalAmount" <> v.goc_moi;


-- ---------------------------------------------------------------------
-- BƯỚC 5 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Câu 1: BẤT BIẾN Σ(gốc các kỳ) = số tiền vay. Phải trả về 0 dòng.

SELECT lc."Id", lc."ContractNumber",
       coalesce(lc."LoanAmount", lc."ContractAmount", 0) AS so_tien_vay,
       sum(rs."PrincipalAmount") AS tong_goc_lich,
       sum(rs."PrincipalAmount") - coalesce(lc."LoanAmount", lc."ContractAmount", 0) AS lech
FROM public."LoanContracts" lc
JOIN public."RepaymentSchedules" rs ON rs."ContractId" = lc."Id"
GROUP BY lc."Id", lc."ContractNumber", lc."LoanAmount", lc."ContractAmount"
HAVING sum(rs."PrincipalAmount") <> coalesce(lc."LoanAmount", lc."ContractAmount", 0)
ORDER BY abs(sum(rs."PrincipalAmount") - coalesce(lc."LoanAmount", lc."ContractAmount", 0)) DESC;

-- Câu 2: gốc các kỳ chưa trả phải chia hết cho 10.000. Phải trả về 0 dòng.

SELECT rs."ContractId", rs."PeriodNumber", rs."PrincipalAmount"
FROM public."RepaymentSchedules" rs
JOIN public."LoanContracts" lc ON lc."Id" = rs."ContractId"
WHERE NOT rs."IsPaid"
  AND coalesce(lc."PrincipalRepaymentMethod", 'Gốc trả cuối kỳ') <> 'Gốc trả cuối kỳ'
  AND rs."PrincipalAmount" > 0
  AND mod(rs."PrincipalAmount"::numeric, 10000) <> 0
  AND rs."PeriodNumber" <> (
    SELECT max(x."PeriodNumber") FROM public."RepaymentSchedules" x
    WHERE x."ContractId" = rs."ContractId" AND NOT x."IsPaid"
  )
ORDER BY rs."ContractId", rs."PeriodNumber";

-- Câu 3: đối chiếu số cũ và số mới của những dòng đã đổi.

SELECT b."ContractId", b."PeriodNumber",
       b."PrincipalAmount" AS goc_cu, rs."PrincipalAmount" AS goc_moi,
       rs."PrincipalAmount" - b."PrincipalAmount" AS chenh
FROM public."_backup_SchedulePrincipal_20260805" b
JOIN public."RepaymentSchedules" rs ON rs."Id" = b."Id"
WHERE rs."PrincipalAmount" <> b."PrincipalAmount"
ORDER BY b."ContractId", b."PeriodNumber";
