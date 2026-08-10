-- Xoá các bảng chỉ ứng dụng WPF từng ghi vào.
--
-- CHẠY supabase/reports/08_tan_du_wpf.sql TRƯỚC. Migration này tự chặn nếu bảng
-- còn dòng, nhưng báo cáo cho biết TRƯỚC là sẽ chặn ở bảng nào, đỡ phải chạy
-- rồi mới biết.
--
-- Vì sao xoá được: web app không đọc một bảng nào dưới đây — kiểm chứng bằng
-- cách quét toàn bộ .from('<bảng>') trong src/, ra đúng 19 bảng và không có
-- bảng nào ở danh sách này. Ứng dụng WPF đã ngừng hoạt động 06/08/2026 và mã
-- nguồn của nó bị xoá khỏi repo từ 30/07/2026.
--
-- Bảng nào ứng với cái gì bên web:
--   Loans              -> LoanContracts
--   LoanSchedules      -> RepaymentSchedules
--   LoanCollaterals    -> CreditContracts.CollateralIds
--   PostLoanControls   -> PostLoanControlRecords
--   ApprovalConditions -> không có bản thay thế; điều kiện phê duyệt hiện nằm
--                         ở CreditContracts và IsLtvException/LtvExceptionReason
--   __EFMigrationsHistory -> bảng nội bộ của Entity Framework, không phải dữ liệu
--
-- DÙNG RESTRICT, KHÔNG DÙNG CASCADE. Cascade sẽ âm thầm kéo theo bất cứ thứ gì
-- đang phụ thuộc — kể cả thứ thuộc về web app mà báo cáo chưa nhìn ra. Restrict
-- thì đổ lỗi và bắt xử lý bằng mắt.

BEGIN;

-- 1. Chặn nếu bảng còn dòng. Bảng rỗng thì xoá là gỡ khung sườn chết; bảng còn
--    dòng thì đó là dữ liệu chỉ tồn tại ở đường WPF và phải đối chiếu trước.

DO $$
DECLARE
  ten_bang  text;
  so_dong   bigint;
  con_du    text := '';
BEGIN
  FOREACH ten_bang IN ARRAY ARRAY[
    'Loans', 'LoanSchedules', 'LoanCollaterals',
    'ApprovalConditions', 'PostLoanControls'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ten_bang
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.%I', ten_bang) INTO so_dong;
      IF so_dong > 0 THEN
        con_du := con_du || format('%s: %s dòng; ', ten_bang, so_dong);
      END IF;
    END IF;
  END LOOP;

  IF con_du <> '' THEN
    RAISE EXCEPTION
      'Dừng lại: bảng WPF còn dữ liệu — %. Đối chiếu bằng report 08 rồi mới xoá.',
      con_du;
  END IF;
END $$;


-- 2. Xoá. Thứ tự từ bảng phụ thuộc về bảng gốc để RESTRICT không đổ oan.

DROP TABLE IF EXISTS "LoanSchedules"      RESTRICT;
DROP TABLE IF EXISTS "LoanCollaterals"    RESTRICT;
DROP TABLE IF EXISTS "ApprovalConditions" RESTRICT;
DROP TABLE IF EXISTS "PostLoanControls"   RESTRICT;
DROP TABLE IF EXISTS "Loans"              RESTRICT;

DROP TABLE IF EXISTS "__EFMigrationsHistory" RESTRICT;

COMMIT;


-- 3. Đối chiếu sau khi chạy.
--    con_bang_wpf phải bằng 0.
--    so_bang_con_lai phải bằng số bảng web app thật sự dùng — đếm để biết không
--    xoá lố sang bảng nào khác.

SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('Loans', 'LoanSchedules', 'LoanCollaterals',
                          'ApprovalConditions', 'PostLoanControls',
                          '__EFMigrationsHistory'))          AS con_bang_wpf,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS so_bang_con_lai;


-- 4. Không bảng nào còn lại được hở RLS. Kỳ vọng: 0 dòng.

SELECT c.relname AS bang_ho_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY 1;
