-- =====================================================================
-- Đổi LoanContracts."HdtdDueDate" từ timestamptz sang date
-- =====================================================================
-- Mọi cột ngày khác trong lược đồ đều là `date`. Riêng cột này còn kiểu
-- timestamptz nên PostgREST trả về '2026-05-28T00:00:00+00:00' thay vì
-- '2026-05-28'. Hệ quả đo được trong mã nguồn:
--
--   * creditLimit.ts so chuỗi `end > g.endDate` giữa một giá trị có múi giờ
--     và một giá trị dạng ngày ngắn — sai thứ tự, đủ để lấy sai mốc hết
--     hiệu lực của cả nhóm hạn mức.
--   * DashboardView và LoanPortfolioView tự chặn bằng regex
--     /^\d{4}-\d{2}-\d{2}$/ nên giá trị timestamptz LUÔN bị loại. Nhánh dự
--     phòng "chưa khai ContractEndDate thì đọc HdtdDueDate" coi như chết.
--   * saveContractAPI xoá hẳn trường khỏi payload khi nó không khớp regex,
--     nên mở một KUNN cũ rồi lưu là mất giá trị mà giao diện vẫn báo thành công.
--
-- Mã nguồn đã gom việc chuẩn hoá về `toIsoDate` trong src/lib/utils.ts, chạy
-- đúng với cả hai kiểu. Đổi kiểu cột để không còn phải chuẩn hoá về sau.
--
-- THỨ TỰ TRIỂN KHAI: chạy migration này TRƯỚC khi deploy mã mới.
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT: kiểu hiện tại và các giá trị đang có
-- ---------------------------------------------------------------------
-- Câu 1 cho biết có cần chạy tiếp hay không: data_type = 'date' là đã xong.

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'LoanContracts'
  AND column_name = 'HdtdDueDate';

-- Câu 2: những dòng có giá trị, kèm phần giờ đang lưu. Phải chắc chắn không
-- dòng nào mang giờ khác 00:00 theo giờ Việt Nam — nếu có, ép về date sẽ lùi
-- hoặc tiến một ngày. Cột `lech_ngay` khác 0 là dấu hiệu phải xử lý tay.

SELECT
  lc."Id",
  lc."ContractNumber",
  lc."HdtdDueDate"                                                 AS gia_tri_tho,
  (lc."HdtdDueDate" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date         AS theo_gio_vn,
  (lc."HdtdDueDate" AT TIME ZONE 'UTC')::date                      AS theo_gio_utc,
  (lc."HdtdDueDate" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    - (lc."HdtdDueDate" AT TIME ZONE 'UTC')::date                  AS lech_ngay
FROM public."LoanContracts" lc
WHERE lc."HdtdDueDate" IS NOT NULL
ORDER BY lc."Id";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — SAO LƯU giá trị cũ
-- ---------------------------------------------------------------------
-- Xoá bảng này sau khi chạy ổn vài ngày.

CREATE TABLE IF NOT EXISTS public."_backup_HdtdDueDate_20260805" (
  "Id" integer PRIMARY KEY,
  "HdtdDueDate" text,
  "SavedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_HdtdDueDate_20260805" ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_HdtdDueDate_20260805" ("Id", "HdtdDueDate")
SELECT "Id", "HdtdDueDate"::text
FROM public."LoanContracts"
WHERE "HdtdDueDate" IS NOT NULL
ON CONFLICT ("Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — ĐỔI KIỂU
-- ---------------------------------------------------------------------
-- Ép về ngày theo GIỜ VIỆT NAM, không theo UTC: giá trị được banker nhập từ
-- trình duyệt ở múi giờ +07, nên ngày người nhập thấy là ngày theo giờ VN.
-- Ép mặc định (::date trên timestamptz) dùng TimeZone của session — không
-- đoán được, phải khai tường minh.
--
-- Bọc trong DO để chạy lại lần hai không lỗi khi cột đã là date.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'LoanContracts'
      AND column_name = 'HdtdDueDate'
      AND data_type <> 'date'
  ) THEN
    ALTER TABLE public."LoanContracts"
      ALTER COLUMN "HdtdDueDate" TYPE date
      USING ("HdtdDueDate" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- BƯỚC 4 — KIỂM CHỨNG SAU KHI CHẠY
-- ---------------------------------------------------------------------
-- Câu 1 phải cho data_type = 'date'.
-- Câu 2 phải trả về 0 dòng: không giá trị nào bị lệch ngày so với bản sao lưu.

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'LoanContracts'
  AND column_name = 'HdtdDueDate';

SELECT lc."Id", b."HdtdDueDate" AS gia_tri_cu, lc."HdtdDueDate" AS gia_tri_moi
FROM public."_backup_HdtdDueDate_20260805" b
JOIN public."LoanContracts" lc ON lc."Id" = b."Id"
WHERE lc."HdtdDueDate"::text <> left(b."HdtdDueDate", 10);
