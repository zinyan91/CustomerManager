-- Rà soát tàn dư ứng dụng WPF còn lại trong database. CHỈ ĐỌC, không ghi.
--
-- Mã nguồn WPF đã bị xoá khỏi repo ngày 30/07/2026 (commit 2f4bc10), nhưng nó
-- kết nối trực tiếp tới chính database này bằng superuser Postgres và ghi vào
-- BỘ BẢNG RIÊNG, không phải bảng của web app:
--
--   WPF ghi          | Web app dùng
--   -----------------|---------------------------
--   Loans            | LoanContracts
--   LoanSchedules    | RepaymentSchedules
--   LoanCollaterals  | CreditContracts.CollateralIds
--   ApprovalConditions | (không có bản thay thế)
--   PostLoanControls | PostLoanControlRecords
--
-- Web app không đọc một bảng nào trong cột trái — đã kiểm chứng bằng cách quét
-- toàn bộ lời gọi .from('<bảng>') trong src/.
--
-- CHẠY BÁO CÁO NÀY TRƯỚC MIGRATION 35. Nếu bảng nào còn dòng, phải đối chiếu
-- xem đó là dữ liệu chỉ tồn tại ở đường WPF hay bản sao của dữ liệu web,
-- rồi mới quyết định xoá.


-- PHẦN 1. Bảng nào còn tồn tại, và có bao nhiêu dòng.

SELECT
  t.table_name                                                   AS ten_bang,
  (SELECT count(*) FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS so_cot,
  (xpath('/row/c/text()',
     query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.table_name),
                  false, true, '')))[1]::text::bigint            AS so_dong,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS so_policy_rls,
  (SELECT c.relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = t.table_name)     AS rls_dang_bat
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'Loans', 'LoanSchedules', 'LoanCollaterals',
    'ApprovalConditions', 'PostLoanControls', '__EFMigrationsHistory'
  )
ORDER BY t.table_name;


-- PHẦN 2. Khoá ngoại trỏ TỚI các bảng này từ bảng khác.
-- Có dòng nào ở đây nghĩa là không xoá được bằng DROP TABLE trần —
-- phải xử lý bảng phụ thuộc trước, hoặc bảng phụ thuộc cũng là tàn dư WPF.

SELECT
  src_ns.nspname  || '.' || src.relname  AS bang_phu_thuoc,
  con.conname                            AS ten_khoa_ngoai,
  tgt_ns.nspname  || '.' || tgt.relname  AS tro_toi_bang
FROM pg_constraint con
JOIN pg_class src     ON src.oid = con.conrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_class tgt     ON tgt.oid = con.confrelid
JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
WHERE con.contype = 'f'
  AND tgt.relname IN (
    'Loans', 'LoanSchedules', 'LoanCollaterals',
    'ApprovalConditions', 'PostLoanControls'
  )
ORDER BY 3, 1;


-- PHẦN 3. Có view, function hay trigger nào còn tham chiếu tới các bảng này.

SELECT
  n.nspname || '.' || p.proname AS ten_ham,
  'function'                    AS loai
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosrc ~ '(Loans|LoanSchedules|LoanCollaterals|ApprovalConditions|PostLoanControls)'

UNION ALL

SELECT
  schemaname || '.' || viewname,
  'view'
FROM pg_views
WHERE schemaname = 'public'
  AND definition ~ '(Loans|LoanSchedules|LoanCollaterals|ApprovalConditions|PostLoanControls)'

ORDER BY 2, 1;


-- PHẦN 4. Nếu LoanSchedules còn dòng: nó có phải bản sao của RepaymentSchedules
-- hay là bản ghi độc lập. So số dòng và khoảng ngày của hai bảng.
-- Bỏ qua phần này nếu PHẦN 1 báo LoanSchedules không tồn tại.

SELECT
  'RepaymentSchedules' AS bang,
  count(*)             AS so_dong,
  count(*) FILTER (WHERE "IsPaid")            AS so_ky_da_thu,
  min("DueDate")::text                        AS den_han_som_nhat,
  max("DueDate")::text                        AS den_han_muon_nhat
FROM "RepaymentSchedules";
