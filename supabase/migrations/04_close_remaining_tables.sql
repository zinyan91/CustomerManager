-- =====================================================================
-- BỔ SUNG: đóng nốt các bảng chưa được bảo vệ
-- =====================================================================
-- File 02 chỉ bảo vệ 5 bảng mà web app đang dùng. Database còn các bảng
-- khác kế thừa từ ứng dụng WPF, vẫn đang mở hoàn toàn với anon key.
--
-- Chạy MỤC 1 trước để biết bảng nào còn dữ liệu, rồi mới chạy MỤC 2.
-- =====================================================================


-- ---------------------------------------------------------------------
-- MỤC 1 — CHẨN ĐOÁN: các bảng này còn dữ liệu không?
-- ---------------------------------------------------------------------
SELECT 'Loans'                 AS bang, count(*) AS so_dong FROM public."Loans"
UNION ALL SELECT 'LoanSchedules',       count(*) FROM public."LoanSchedules"
UNION ALL SELECT 'LoanCollaterals',     count(*) FROM public."LoanCollaterals"
UNION ALL SELECT 'ContractCollaterals', count(*) FROM public."ContractCollaterals"
UNION ALL SELECT 'ApprovalConditions',  count(*) FROM public."ApprovalConditions"
UNION ALL SELECT 'PostLoanControls',    count(*) FROM public."PostLoanControls"
ORDER BY so_dong DESC;


-- ---------------------------------------------------------------------
-- MỤC 2 — ĐÓNG NGAY: bật RLS, không tạo policy nào
-- ---------------------------------------------------------------------
-- Bật RLS mà không có policy = CHẶN TOÀN BỘ với anon và authenticated.
-- Đây là nguyên tắc "từ chối mặc định": đóng lỗ hổng trước, mở lại sau
-- theo đúng nhu cầu thực tế.
--
-- KHÔNG làm hỏng web app: 5 phân hệ hiện tại không truy cập các bảng này.
--
-- KHÔNG làm hỏng app WPF: ứng dụng cũ kết nối trực tiếp bằng tài khoản
-- superuser postgres, mà superuser thì bỏ qua RLS.
-- ⚠️ Nếu WPF đã được đổi sang tài khoản thường, hãy kiểm tra lại trước.

ALTER TABLE public."Loans"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoanSchedules"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoanCollaterals"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContractCollaterals"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApprovalConditions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PostLoanControls"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."__EFMigrationsHistory" ENABLE ROW LEVEL SECURITY;

-- Thu hồi grant — phòng thủ nhiều lớp
REVOKE ALL ON public."Loans"                 FROM anon, authenticated;
REVOKE ALL ON public."LoanSchedules"         FROM anon, authenticated;
REVOKE ALL ON public."LoanCollaterals"       FROM anon, authenticated;
REVOKE ALL ON public."ContractCollaterals"   FROM anon, authenticated;
REVOKE ALL ON public."ApprovalConditions"    FROM anon, authenticated;
REVOKE ALL ON public."PostLoanControls"      FROM anon, authenticated;
REVOKE ALL ON public."__EFMigrationsHistory" FROM anon, authenticated;


-- ---------------------------------------------------------------------
-- MỤC 3 — KIỂM CHỨNG: toàn bộ phải là true
-- ---------------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;
-- Kỳ vọng: KHÔNG trả về dòng nào.


-- ---------------------------------------------------------------------
-- HOÀN TÁC (nếu có hệ thống khác đang phụ thuộc các bảng này)
-- ---------------------------------------------------------------------
-- ALTER TABLE public."Loans"                 DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."LoanSchedules"         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."LoanCollaterals"       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."ContractCollaterals"   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."ApprovalConditions"    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."PostLoanControls"      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."__EFMigrationsHistory" DISABLE ROW LEVEL SECURITY;
