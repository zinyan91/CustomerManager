-- =====================================================================
-- BÁO CÁO — Lãi thu chênh do kỳ trả nợ đầu tiên rơi trước ngày giải ngân
-- =====================================================================
-- CHỈ ĐỌC. Không UPDATE, không INSERT, không sinh lại lịch.
--
-- Quyết định 05/08/2026: phần đã thu vượt CHƯA xử lý — chỉ xuất báo cáo để
-- trình cấp trên. Không cấn trừ, không hoàn, không ghi điều chỉnh.
--
-- Bối cảnh: hợp đồng hạn mức khai một mốc trả nợ chung ở cấp hợp đồng
-- (15/04/2026), trong khi mỗi KUNN giải ngân một ngày khác trong tháng 5. Lịch
-- cộng dồn từ mốc đó nên kỳ 1 đến hạn TRƯỚC ngày tiền ra khỏi ngân hàng, và
-- getDaysBetween chặn số âm về 1 nên kỳ 1 chỉ tính 1 ngày lãi. Các kỳ sau lệch
-- theo, mỗi kỳ tính nhiều ngày hơn thực tế.
--
-- Hai chiều lệch cùng tồn tại trên một khoản, đừng bù trừ trong đầu:
--   * kỳ đã thu: thu THỪA vì số ngày tính lãi dài hơn quãng thực tế
--   * cả vòng đời: THIẾU đúng một tháng lãi vì lịch kết thúc sớm hơn đáo hạn
--
-- Nguyên tắc số ngày ở đây theo đúng công thức đang cài trong loanMath.ts:
--   Lãi = Dư nợ × Lãi suất năm × Số ngày thực tế / 365
-- Mốc đầu của kỳ 1 là NGÀY GIẢI NGÂN; mốc đầu các kỳ sau là ngày đến hạn kỳ
-- trước. Không dùng số ngày tròn tháng.
--
-- Kiểm chứng 05/08/2026: `ActualPaidInterest` = 0 ở TOÀN BỘ 898/898 kỳ đã thu
-- trên hệ thống — cột này chưa từng được điền khi di trú dữ liệu, không phải
-- "đã thu 0 đồng lãi". PHẦN 2 và PHẦN 3 dùng `InterestAmount` (số đã ghi sổ)
-- làm số lãi đã thu, không coalesce với `ActualPaidInterest`. Nếu sau này banker
-- bắt đầu ghi `ActualPaidInterest` qua giao diện, rà soát lại giả định này.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — Những KUNN có kỳ trả nợ đầu tiên KHÔNG sau ngày giải ngân
-- ---------------------------------------------------------------------
-- Đây là danh sách khoản bị ảnh hưởng. Cột `so_ngay_lech` là khoảng thời gian
-- lịch đã tính lãi cho quãng tiền chưa ra khỏi ngân hàng.

WITH ky_dau AS (
  SELECT
    rs."ContractId",
    min(rs."DueDate") AS ngay_ky_1
  FROM public."RepaymentSchedules" rs
  GROUP BY 1
)
SELECT
  lc."Id"                       AS kunn_id,
  c."FullName"                  AS khach_hang,
  lc."ContractNumber"           AS so_kunn,
  lc."DisbursementDate"         AS ngay_giai_ngan,
  lc."RepaymentStartDate"       AS moc_tra_no_dang_khai,
  k.ngay_ky_1                   AS ky_1_den_han,
  lc."KunnDueDate"              AS ngay_dao_han,
  lc."KunnTenor"                AS thoi_han_khai,
  lc."LoanAmount"               AS so_tien_vay,
  k.ngay_ky_1 - lc."DisbursementDate" AS so_ngay_lech
FROM public."LoanContracts" lc
JOIN ky_dau k ON k."ContractId" = lc."Id"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE lc."DisbursementDate" IS NOT NULL
  AND k.ngay_ky_1 <= lc."DisbursementDate"
ORDER BY khach_hang, lc."ContractNumber";


-- ---------------------------------------------------------------------
-- PHẦN 2 — Chi tiết từng kỳ ĐÃ THU: số ngày đã tính lãi so với thực tế
-- ---------------------------------------------------------------------
-- Chỉ xét kỳ đã thanh toán, vì chỉ ở đó tiền đã ra khỏi tay khách hàng.
--
--   so_ngay_da_tinh : số ngày lịch đã dùng để tính lãi cho kỳ đó
--   so_ngay_thuc_te : số ngày quãng dư nợ thực sự tồn tại, mốc đầu kẹp về
--                     ngày giải ngân — trước đó tiền chưa ra khỏi ngân hàng
--   lai_chenh       : lai_da_ghi × so_ngay_lech / so_ngay_da_tinh
--
-- CÁCH TÍNH lai_chenh: suy theo TỶ LỆ SỐ NGÀY trên chính số lãi đã ghi, không
-- dựng lại công thức từ dư nợ × lãi suất. Lý do: RepaymentSchedules KHÔNG lưu
-- dư nợ đầu kỳ và lãi suất áp cho từng kỳ, nên dựng lại phải tự suy hai con số
-- đó — mỗi lần suy là một lần có thể lệch, và lệch trên báo cáo trình cấp trên
-- thì tệ hơn là không có báo cáo. Vì công thức lãi tuyến tính theo số ngày, tỷ
-- lệ số ngày cho ra đúng phần lãi tương ứng với quãng lệch, dùng đúng dư nợ và
-- đúng lãi suất mà kỳ đó đã thực áp.
--
-- Số DƯƠNG ở `lai_chenh` là thu THỪA của khách hàng.
-- Số ÂM là thu THIẾU — kỳ 1 rơi vào đây vì hàm đếm ngày chặn số âm về 1 ngày.

WITH ky AS (
  SELECT
    rs."Id"                AS schedule_id,
    rs."ContractId",
    rs."PeriodNumber",
    rs."DueDate",
    rs."InterestAmount",
    rs."ActualPaidInterest",
    rs."IsPaid",
    rs."PaymentDate",
    lag(rs."DueDate") OVER (PARTITION BY rs."ContractId" ORDER BY rs."PeriodNumber")
                           AS ky_truoc_den_han
  FROM public."RepaymentSchedules" rs
),
tinh AS (
  SELECT
    lc."Id"                AS kunn_id,
    c."FullName"           AS khach_hang,
    lc."ContractNumber"    AS so_kunn,
    lc."DisbursementDate"  AS ngay_giai_ngan,
    k."PeriodNumber"       AS ky,
    k."DueDate"            AS den_han,
    k."PaymentDate"        AS ngay_thu,
    k."InterestAmount"     AS lai_da_ghi,
    k."ActualPaidInterest" AS lai_da_thu,

    -- Mốc đầu kỳ theo cách lịch đang cộng: kỳ 1 lấy ngày giải ngân.
    greatest(k."DueDate" - coalesce(k.ky_truoc_den_han, lc."DisbursementDate"), 1)
                           AS so_ngay_da_tinh,

    -- Mốc đầu kỳ đúng nghiệp vụ: không sớm hơn ngày giải ngân.
    greatest(k."DueDate" - greatest(coalesce(k.ky_truoc_den_han, lc."DisbursementDate"),
                                    lc."DisbursementDate"), 0)
                           AS so_ngay_thuc_te
  FROM ky k
  JOIN public."LoanContracts" lc ON lc."Id" = k."ContractId"
  LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
  WHERE k."IsPaid" = true
    AND lc."DisbursementDate" IS NOT NULL
)
SELECT
  t.kunn_id,
  t.khach_hang,
  t.so_kunn,
  t.ngay_giai_ngan,
  t.ky,
  t.den_han,
  t.ngay_thu,
  t.so_ngay_da_tinh,
  t.so_ngay_thuc_te,
  t.so_ngay_da_tinh - t.so_ngay_thuc_te AS so_ngay_lech,
  t.lai_da_ghi,
  t.lai_da_thu,
  round(
    t.lai_da_ghi
    * (t.so_ngay_da_tinh - t.so_ngay_thuc_te) / t.so_ngay_da_tinh::numeric
  ) AS lai_chenh
FROM tinh t
WHERE t.so_ngay_da_tinh <> t.so_ngay_thuc_te
ORDER BY t.khach_hang, t.so_kunn, t.ky;


-- ---------------------------------------------------------------------
-- PHẦN 3 — Tổng hợp theo từng khoản vay
-- ---------------------------------------------------------------------
-- Con số để trình: mỗi KUNN một dòng.
--
-- Tách hai chiều thay vì chỉ đưa số ròng: `thu_thua` là tiền của khách hàng
-- đang nằm ở ngân hàng, `thu_thieu` là nghĩa vụ chưa thu đủ. Gộp lại thành một
-- con số ròng sẽ làm mất chính điều mà cấp trên cần quyết định.

WITH ky AS (
  SELECT
    rs."ContractId",
    rs."PeriodNumber",
    rs."DueDate",
    rs."IsPaid",
    rs."InterestAmount",
    rs."ActualPaidInterest",
    lag(rs."DueDate") OVER (PARTITION BY rs."ContractId" ORDER BY rs."PeriodNumber")
      AS ky_truoc_den_han
  FROM public."RepaymentSchedules" rs
),
chenh AS (
  SELECT
    lc."Id"             AS kunn_id,
    lc."CustomerId",
    lc."ContractNumber" AS so_kunn,
    round(
      k."InterestAmount"
      * (greatest(k."DueDate" - coalesce(k.ky_truoc_den_han, lc."DisbursementDate"), 1)
         - greatest(k."DueDate" - greatest(coalesce(k.ky_truoc_den_han, lc."DisbursementDate"),
                                           lc."DisbursementDate"), 0))
      / greatest(k."DueDate" - coalesce(k.ky_truoc_den_han, lc."DisbursementDate"), 1)::numeric
    ) AS lai_chenh
  FROM ky k
  JOIN public."LoanContracts" lc ON lc."Id" = k."ContractId"
  WHERE k."IsPaid" = true
    AND lc."DisbursementDate" IS NOT NULL
)
SELECT
  ch.kunn_id,
  c."FullName"                                          AS khach_hang,
  ch.so_kunn,
  count(*)                                              AS so_ky_da_thu,
  sum(greatest(ch.lai_chenh, 0))                        AS thu_thua,
  sum(least(ch.lai_chenh, 0))                           AS thu_thieu,
  sum(ch.lai_chenh)                                     AS chenh_rong
FROM chenh ch
LEFT JOIN public."Customers" c ON c."Id" = ch."CustomerId"
GROUP BY ch.kunn_id, c."FullName", ch.so_kunn
HAVING sum(abs(ch.lai_chenh)) <> 0
ORDER BY thu_thua DESC;


-- ---------------------------------------------------------------------
-- PHẦN 4 — Chiều lệch còn lại: lịch kết thúc trước ngày đáo hạn
-- ---------------------------------------------------------------------
-- Phần này chưa thu, và là số THIẾU chứ không phải thừa. Để riêng vì hai
-- chiều lệch không được bù trừ trong cùng một con số trình lên.
--
-- `so_ngay_thieu` là quãng từ kỳ cuối trong lịch tới ngày đáo hạn ghi trên
-- GNN. Lớn hơn 0 nghĩa là lịch đang thiếu lãi của quãng đó.

WITH ky_cuoi AS (
  SELECT
    rs."ContractId",
    max(rs."DueDate") AS ky_cuoi_den_han,
    count(*)          AS so_ky
  FROM public."RepaymentSchedules" rs
  GROUP BY 1
)
SELECT
  lc."Id"                AS kunn_id,
  c."FullName"           AS khach_hang,
  lc."ContractNumber"    AS so_kunn,
  lc."KunnTenor"         AS thoi_han_khai,
  kc.so_ky              AS so_ky_trong_lich,
  kc.ky_cuoi_den_han,
  lc."KunnDueDate"       AS ngay_dao_han,
  lc."KunnDueDate" - kc.ky_cuoi_den_han AS so_ngay_thieu,
  lc."CurrentBalance"    AS du_no_hien_tai,
  lc."InterestRate"      AS ls_hien_hanh,
  round(
    coalesce(lc."CurrentBalance", lc."LoanAmount") * lc."InterestRate"
    * (lc."KunnDueDate" - kc.ky_cuoi_den_han) / 365.0
  )                      AS lai_con_thieu_uoc_tinh
FROM public."LoanContracts" lc
JOIN ky_cuoi kc ON kc."ContractId" = lc."Id"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE lc."KunnDueDate" IS NOT NULL
  AND lc."KunnDueDate" > kc.ky_cuoi_den_han
ORDER BY lai_con_thieu_uoc_tinh DESC;


-- ---------------------------------------------------------------------
-- PHẦN 5 — Mốc trả nợ đang khai bằng mốc của HỢP ĐỒNG, không phải của KUNN
-- ---------------------------------------------------------------------
-- Quyết định 05/08/2026: ngày trả nợ kỳ 1 do KHÁCH HÀNG chọn và ghi trên từng
-- GNN — có khách chọn ngày 1, ngày 15, ngày 28, ngày 30. KHÔNG suy được từ
-- ngày giải ngân, cũng KHÔNG gom về một ngày dùng chung cho cả hợp đồng.
-- Ví dụ thật: LÊ NGỌC QUẾ HÂN giải ngân 05/05/2026, trả kỳ 1 ngày 15/05/2026 —
-- kỳ 1 chỉ 10 ngày, không phải một tháng.
--
-- Vì vậy `RepaymentStartDate` của từng KUNN là DỮ LIỆU GỐC phải khai theo GNN
-- giấy. Câu dưới liệt kê những KUNN đang mượn mốc của hợp đồng hoặc bỏ trống —
-- đây là danh sách cần đối chiếu chứng từ, chưa phải kết luận sai.

SELECT
  lc."Id"                  AS kunn_id,
  c."FullName"             AS khach_hang,
  lc."ContractNumber"      AS so_kunn,
  lc."DisbursementDate"    AS ngay_giai_ngan,
  lc."RepaymentStartDate"  AS moc_tra_no_kunn,
  cc."ContractStartDate"   AS hdtd_hieu_luc_tu,
  CASE
    WHEN lc."RepaymentStartDate" IS NULL             THEN 'chưa khai — lịch đang mặc định giải ngân + 1 tháng'
    WHEN lc."RepaymentStartDate" <= lc."DisbursementDate"
                                                     THEN 'mốc trước hoặc bằng ngày giải ngân — sai chắc chắn'
    WHEN extract(day FROM lc."RepaymentStartDate")
       = extract(day FROM cc."ContractStartDate")    THEN 'trùng ngày trong tháng với mốc HĐTD — nghi mượn mốc hợp đồng'
    ELSE 'khác'
  END                      AS chan_doan
FROM public."LoanContracts" lc
LEFT JOIN public."CreditContracts" cc ON cc."Id" = lc."CreditContractId"
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE lc."DisbursementDate" IS NOT NULL
  AND (
    lc."RepaymentStartDate" IS NULL
    OR lc."RepaymentStartDate" <= lc."DisbursementDate"
    OR extract(day FROM lc."RepaymentStartDate") = extract(day FROM cc."ContractStartDate")
  )
ORDER BY khach_hang, lc."ContractNumber";


-- ---------------------------------------------------------------------
-- PHẦN 6 — KunnTenor khai lệch với khoảng cách giải ngân → đáo hạn
-- ---------------------------------------------------------------------
-- Chỉ là GỢI Ý để đối chiếu GNN giấy, không phải kết luận. `thoi_han_tinh`
-- suy từ KunnDueDate - DisbursementDate; KunnDueDate là dữ liệu gốc nên
-- lệch ở đây có thể do KunnTenor khai sai HOẶC do KunnDueDate khai sai —
-- phải mở GNN giấy ra mới biết cột nào đúng. Ví dụ đã biết: GNN của ĐOÀN
-- THỊ TUYỂN ghi 06 tháng, đáo hạn 23/10/2026, hệ thống đang lưu 05 tháng /
-- 23/09/2026 — ở đây KunnTenor VÀ KunnDueDate cùng sai.

WITH tenor AS (
  SELECT
    lc.*,
    coalesce((regexp_match(lc."KunnTenor", '\d+'))[1]::int, lc."LoanTenorMonths") AS thoi_han_khai_thang,
    (extract(year FROM age(lc."KunnDueDate", lc."DisbursementDate")) * 12
      + extract(month FROM age(lc."KunnDueDate", lc."DisbursementDate")))::int   AS thoi_han_tinh_thang
  FROM public."LoanContracts" lc
  WHERE lc."DisbursementDate" IS NOT NULL
    AND lc."KunnDueDate" IS NOT NULL
)
SELECT
  t."Id"                AS kunn_id,
  c."FullName"           AS khach_hang,
  t."ContractNumber"     AS so_kunn,
  t."DisbursementDate"   AS ngay_giai_ngan,
  t."KunnDueDate"        AS ngay_dao_han,
  t."KunnTenor"          AS thoi_han_khai,
  t.thoi_han_khai_thang,
  t.thoi_han_tinh_thang  AS thoi_han_tinh_tu_ngay_dao_han
FROM tenor t
LEFT JOIN public."Customers" c ON c."Id" = t."CustomerId"
WHERE t.thoi_han_khai_thang IS DISTINCT FROM t.thoi_han_tinh_thang
ORDER BY khach_hang, t."ContractNumber";
