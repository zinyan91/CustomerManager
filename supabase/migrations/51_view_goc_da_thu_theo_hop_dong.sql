-- 51. View gộp gốc đã thu theo từng hợp đồng.
--
-- Vì sao cần: dashboard trước đây đọc dư nợ từ cột "CurrentBalance" do người gõ
-- tay, còn tab Hợp đồng và tab Khoản vay suy dư nợ từ lịch trả nợ. Hai định
-- nghĩa cho cùng một câu hỏi, đo ngày 18/08/2026 lệch 151,2 triệu trên 10 hồ sơ.
--
-- Vì sao là view chứ không kéo lịch về trình duyệt: kéo thô mất 1.477 ms cho
-- riêng 1.000 dòng đầu trên tổng 8.659 dòng — đúng cách đã từng đẩy dashboard từ
-- 1,2s lên 8,8s. Gộp ở máy chủ trả về 122 dòng.
--
-- Vì sao không dùng hàm gộp của PostgREST: dự án chặn (PGRST123).
--
-- Biểu thức CASE phải khớp TỪNG NHÁNH với paidPrincipalOf trong
-- src/lib/loanMath.ts. Đổi một bên thì đổi cả hai, nếu không sẽ có định nghĩa
-- thứ ba. Ba nhánh, đúng thứ tự:
--   1. Đã khai số thu thật  -> ActualPaidPrincipal + PrepaidPrincipalAmount
--   2. Chỉ đánh dấu đã thu  -> PrincipalAmount
--   3. Còn lại              -> PrepaidPrincipalAmount
-- Hai cột ActualPaidPrincipal và PrepaidPrincipalAmount có số thật (7 và 2 dòng
-- ngày 18/08/2026), không được rút gọn biểu thức.

DROP VIEW IF EXISTS "ContractPaidPrincipal";

CREATE VIEW "ContractPaidPrincipal"
WITH (security_invoker = off) AS
WITH goc AS MATERIALIZED (
  SELECT
    s."ContractId",
    sum(
      CASE
        WHEN coalesce(s."ActualPaidPrincipal", 0) > 0
          THEN coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."PrepaidPrincipalAmount", 0)
        WHEN coalesce(s."IsPaid", false)
          THEN coalesce(s."PrincipalAmount", 0)
        ELSE coalesce(s."PrepaidPrincipalAmount", 0)
      END
    )::numeric AS "PaidPrincipal"
  FROM "RepaymentSchedules" s
  GROUP BY s."ContractId"
)
SELECT g."ContractId", g."PaidPrincipal"
FROM goc g
WHERE public.can_access_contract(g."ContractId");

-- ⚠️ HAI ĐIỂM KHÔNG ĐƯỢC ĐỘNG VÀO
--
-- 1. `security_invoker = off` nghĩa là view chạy dưới quyền chủ sở hữu và
--    KHÔNG chịu RLS của RepaymentSchedules. Mệnh đề WHERE
--    can_access_contract() chính là toàn bộ hàng rào phân quyền — cùng hàm mà
--    policy `repayment_all` của bảng gốc dùng, nên không có đường rò nào khác.
--    Bỏ mệnh đề đó là lộ toàn bộ danh mục cho mọi banker.
--
-- 2. `AS MATERIALIZED` là hàng rào tối ưu BẮT BUỘC, không phải trang trí.
--    Không có nó, planner đẩy can_access_contract xuống Seq Scan thành bộ lọc
--    từng dòng: 8.659 lần gọi, đo được 909 ms. Có nó thì hàm chỉ chạy trên 122
--    nhóm đã gộp: 21 ms. Đo qua REST từ trình duyệt: 1.336 ms -> 170 ms.

COMMENT ON VIEW "ContractPaidPrincipal" IS
  'Goc da thu theo tung hop dong. Bieu thuc khop paidPrincipalOf trong loanMath.ts. security_invoker=off nen menh de WHERE can_access_contract la hang rao phan quyen. AS MATERIALIZED chan planner day ham xuong tung dong.';

REVOKE ALL ON "ContractPaidPrincipal" FROM anon;
GRANT SELECT ON "ContractPaidPrincipal" TO authenticated;
