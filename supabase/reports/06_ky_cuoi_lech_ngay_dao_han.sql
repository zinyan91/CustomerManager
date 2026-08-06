-- =====================================================================
-- Rà soát: kỳ cuối của lịch không rơi đúng ngày đáo hạn
-- =====================================================================
-- GNN ghi "kỳ trả nợ cuối cùng được trả vào NGÀY ĐÁO HẠN". Đo 05/08/2026
-- sau khi sinh lại toàn bộ lịch: 77/97 khoản lệch.
--
-- KHÔNG kết luận 77 là 77 lỗi. Ba nguyên nhân khác nhau cùng cho ra triệu
-- chứng này:
--
--   1. KunnTenor và KunnDueDate khai không khớp nhau — loại mà báo cáo 01
--      PHẦN 6 không bắt được khi CẢ HAI cột cùng sai.
--   2. Lệch dưới 3 ngày có thể ĐÚNG: generateSchedule cố ý không đưa kỳ
--      cuối về đáo hạn khi làm vậy sinh ra một kỳ chỉ 1 ngày (chốt > 1).
--   3. Lịch bị cắt ngắn vì dư nợ về 0 trước hạn do làm tròn gốc — không
--      phải lỗi tiền vì Σgốc vẫn bằng số tiền vay.
--
-- ĐO LẠI 05/08/2026 sau khi anh sửa cả ngày: còn 31/98 lệch, và
-- lech_hon_1_thang = 0 — nhóm khai sai thời hạn đã sạch. Kiểm từng dòng thì
-- CẢ 31 đều cùng một loại: quy tắc kỳ cuối chưa được áp lúc sinh lịch.
-- Dấu hiệu: mọi ky_cuoi rơi ngày 15 (đúng mốc thu hàng tháng) và so_ky bằng
-- đúng KunnTenor. Nguyên nhân (2) KHÔNG giải thích được nhóm lệch 1–3 ngày:
-- NGUYỄN CÔNG TÂM 2002/HĐTD/9633725/GNN-03 có kỳ trước cách đáo hạn 30 ngày,
-- vượt chốt > 1 rất xa mà quy tắc vẫn không áp.
--
-- CẨN THẬN với số tiền vay: mã nguồn dùng `LoanAmount || ContractAmount`
-- (toán tử ||, nên số 0 rơi xuống nhánh sau), KHÔNG phải LoanAmount trần.
-- So thẳng với LoanAmount đã cho một báo động giả 830 triệu trên hồ sơ
-- ĐOÀN NGỌC LÝ 2002/HĐTD/9738792/GNN-01 — khoản có LoanAmount = 0 và lịch
-- lấy 830.000.000 từ ContractAmount.
--
-- CHỈ ĐỌC.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — Bốn bất biến, xem cùng lúc
-- ---------------------------------------------------------------------

WITH k AS (
  SELECT
    l."Id", l."DisbursementDate", l."KunnDueDate",
    coalesce(nullif(l."LoanAmount", 0), l."ContractAmount", 0) AS so_tien_vay,
    sum(s."PrincipalAmount") AS tong_goc,
    min(s."DueDate")         AS ky_1,
    max(s."DueDate")         AS ky_cuoi
  FROM public."LoanContracts" l
  JOIN public."RepaymentSchedules" s ON s."ContractId" = l."Id"
  WHERE l."IsSettled" IS NOT TRUE
  GROUP BY 1, 2, 3, 4
)
SELECT
  count(*)                                                              AS tong_kunn_co_lich,
  count(*) FILTER (WHERE tong_goc <> so_tien_vay)                       AS sai_tong_goc,
  count(*) FILTER (WHERE "DisbursementDate" IS NOT NULL
                     AND ky_1 <= "DisbursementDate")                    AS ky_1_khong_sau_giai_ngan,
  count(*) FILTER (WHERE "KunnDueDate" IS NOT NULL
                     AND ky_cuoi <> "KunnDueDate")                      AS ky_cuoi_lech_dao_han
FROM k;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Lệch theo hướng nào và bao nhiêu ngày
-- ---------------------------------------------------------------------
-- lech_toi_3_ngay gần như chắc là ĐÚNG theo chốt > 1 trong generateSchedule.
-- lech_hon_1_thang là nhóm phải đối chiếu chứng từ.

WITH k AS (
  SELECT
    l."Id", l."KunnDueDate", l."KunnTenor",
    count(s."Id")            AS so_ky,
    max(s."DueDate")         AS ky_cuoi
  FROM public."LoanContracts" l
  JOIN public."RepaymentSchedules" s ON s."ContractId" = l."Id"
  WHERE l."IsSettled" IS NOT TRUE AND l."KunnDueDate" IS NOT NULL
  GROUP BY 1, 2, 3
)
SELECT
  count(*)                                                              AS tong,
  count(*) FILTER (WHERE ky_cuoi = "KunnDueDate")                       AS dung_dao_han,
  count(*) FILTER (WHERE ky_cuoi < "KunnDueDate")                       AS ky_cuoi_som_hon,
  count(*) FILTER (WHERE ky_cuoi > "KunnDueDate")                       AS ky_cuoi_muon_hon,
  count(*) FILTER (WHERE abs(ky_cuoi - "KunnDueDate") <= 3)              AS lech_toi_3_ngay,
  count(*) FILTER (WHERE abs(ky_cuoi - "KunnDueDate") BETWEEN 4 AND 31)  AS lech_4_den_31_ngay,
  count(*) FILTER (WHERE abs(ky_cuoi - "KunnDueDate") > 31)              AS lech_hon_1_thang,
  min(ky_cuoi - "KunnDueDate")                                          AS lech_it_nhat,
  max(ky_cuoi - "KunnDueDate")                                          AS lech_nhieu_nhat
FROM k;


-- ---------------------------------------------------------------------
-- PHẦN 3 — Danh sách, nặng nhất trước
-- ---------------------------------------------------------------------
-- NÂNG ô Limit của editor trên 100 trước khi chạy.
-- so_ky so với KunnTenor cho biết lịch có bị cắt ngắn hay không.

WITH k AS (
  SELECT
    l."Id", l."CustomerId", l."ContractNumber", l."KunnTenor",
    l."DisbursementDate", l."KunnDueDate", l."PrincipalRepaymentMethod",
    count(s."Id")            AS so_ky,
    max(s."DueDate")         AS ky_cuoi
  FROM public."LoanContracts" l
  JOIN public."RepaymentSchedules" s ON s."ContractId" = l."Id"
  WHERE l."IsSettled" IS NOT TRUE AND l."KunnDueDate" IS NOT NULL
  GROUP BY 1, 2, 3, 4, 5, 6, 7
)
SELECT
  c."FullName",
  k."ContractNumber",
  k."KunnTenor",
  k.so_ky,
  k."PrincipalRepaymentMethod",
  k."DisbursementDate",
  k."KunnDueDate",
  k.ky_cuoi,
  k.ky_cuoi - k."KunnDueDate"                                           AS lech_ngay
FROM k
JOIN public."Customers" c ON c."Id" = k."CustomerId"
WHERE k.ky_cuoi <> k."KunnDueDate"
ORDER BY abs(k.ky_cuoi - k."KunnDueDate") DESC, c."FullName";
