-- Job pg_cron cập nhật DebtGroup hàng ngày.
--
-- Vì sao: cột LoanContracts.DebtGroup chỉ được cập nhật khi ai đó thu nợ / tất
-- toán / mở portfolio của KH đó. KH không được đụng tới thì nhóm nợ lưu bị cũ —
-- KH trễ 22 ngày vẫn mang Nhóm 1 trong CSDL (dù giao diện đã tính sống). Job này
-- rà toàn bộ KUNN chưa tất toán mỗi đêm và nâng nhóm cho khớp số ngày quá hạn.
--
-- Chính sách: CHỈ NÂNG, không tự hạ — DebtGroup = max(nhóm đang lưu, nhóm theo
-- số ngày quá hạn lớn nhất của kỳ chưa trả). Quá hạn tăng thì nâng nhóm ngay;
-- việc hạ nhóm để luồng thu nợ/tất toán trong app quyết (chuẩn thận trọng ngân
-- hàng, và khớp đúng cách app hiển thị: max(lưu, auto)).
--
-- Ngày lấy theo giờ VN (Asia/Ho_Chi_Minh), KHÔNG dùng UTC — xem CONVENTIONS.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.refresh_all_debt_groups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  n integer;
BEGIN
  WITH maxo AS (
    SELECT c."Id" AS cid,
      COALESCE(MAX(CASE WHEN s."IsPaid" IS NOT TRUE AND s."DueDate" < today
                        THEN today - s."DueDate" END), 0) AS d
    FROM public."LoanContracts" c
    LEFT JOIN public."RepaymentSchedules" s ON s."ContractId" = c."Id"
    WHERE c."IsSettled" IS NOT TRUE
    GROUP BY c."Id"
  ),
  grp AS (
    SELECT cid,
      CASE
        WHEN d BETWEEN 10 AND 90  THEN 2
        WHEN d BETWEEN 91 AND 180 THEN 3
        WHEN d BETWEEN 181 AND 360 THEN 4
        WHEN d > 360 THEN 5
        ELSE 1
      END AS g
    FROM maxo
  )
  UPDATE public."LoanContracts" c
  SET "DebtGroup" = GREATEST(COALESCE(c."DebtGroup", 1), grp.g)
  FROM grp
  WHERE c."Id" = grp.cid
    AND GREATEST(COALESCE(c."DebtGroup", 1), grp.g) IS DISTINCT FROM c."DebtGroup";
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

COMMENT ON FUNCTION public.refresh_all_debt_groups IS
  'Nâng DebtGroup cho KUNN chưa tất toán = max(nhóm lưu, nhóm theo số ngày quá hạn lớn nhất của kỳ chưa trả). Chỉ nâng, không tự hạ. Ngày theo giờ VN. Chạy bởi pg_cron hàng ngày.';

-- Chỉ hệ thống (postgres/cron) gọi được — chặn user tự kích hoạt cập nhật hàng loạt.
REVOKE ALL ON FUNCTION public.refresh_all_debt_groups() FROM public;

-- Lịch: 00:15 giờ VN mỗi ngày = 17:15 UTC. Idempotent: gỡ job cũ cùng tên trước.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-debt-groups-daily';
SELECT cron.schedule('refresh-debt-groups-daily', '15 17 * * *', $job$SELECT public.refresh_all_debt_groups();$job$);

COMMIT;

-- Đối chiếu sau khi chạy:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'refresh-debt-groups-daily';
--   SELECT public.refresh_all_debt_groups();  -- chạy tay 1 lần, trả số dòng đã nâng nhóm
