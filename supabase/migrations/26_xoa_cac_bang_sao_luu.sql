-- =====================================================================
-- Xoá các bảng sao lưu tạm
-- =====================================================================
-- Các bảng `_backup_*` sinh ra trong đợt sửa dữ liệu 03–05/08/2026 đã hết
-- vai trò: mọi migration liên quan đều đã chạy và kiểm chứng xong.
--
-- Liệt kê tài nguyên từ pg_tables, KHÔNG kể tên bằng tay: cách kể tay
-- từng bỏ sót 7 bảng trong đợt rà soát bảo mật (CONVENTIONS.md §1).
-- =====================================================================


-- ---------------------------------------------------------------------
-- GHI LẠI TRƯỚC KHI XOÁ — bốn giá trị PENALTY_RATE cấp HĐTD
-- ---------------------------------------------------------------------
-- Chúng chỉ tồn tại trong _backup_CreditContractsRateHistory_20260805.
-- Quyết định "lãi suất phạt có khác 150% theo từng khoản không" chưa
-- chốt, nên chép ra đây làm bản ghi vĩnh viễn trong git:
--
--   HĐTD Id 29 · ĐINH TIÊN HOÀNG   · 2002/HĐTD_1/9726862 · PENALTY_RATE:150
--   HĐTD Id 30 · ĐINH TIÊN HOÀNG   · 2002/HĐTD_2/9726862 · PENALTY_RATE:150
--   HĐTD Id 40 · MAI PHƯỚC HIỂN    · PNAT.CN.01290824    · PENALTY_RATE:0
--   HĐTD Id 48 · NGUYỄN THỊ BÉ HAI · PNAT.CN.03111223    · PENALTY_RATE:150
--
-- Ba giá trị cấp KUNN vẫn còn SỐNG trong LoanContracts.Note, không bị
-- migration này ảnh hưởng:
--
--   KUNN 1015 · MAI PHƯỚC HIỂN  · PNAT.CN.01290824/GNN-01    · [PENALTY_RATE:0]
--   KUNN 1017 · MAI PHƯỚC HIỂN  · PNAT.CN.01290824/GNN-02    · [PENALTY_RATE:150]
--   KUNN 1018 · ĐINH TIÊN HOÀNG · 2002/HĐTD_2/9726862/GNN-01 · [PENALTY_RATE:150]
--
-- Lưu ý các con số này TỰ MÂU THUẪN: HĐTD Id 40 ghi 0 trong khi KUNN
-- GNN-02 của chính nó ghi 150. Đó là căn cứ nghiêng về kết luận chúng là
-- ghi chú tay tự do, không phải tham số được quản lý.


-- ---------------------------------------------------------------------
-- BƯỚC 1 — LIỆT KÊ những bảng sẽ bị xoá
-- ---------------------------------------------------------------------

SELECT
  t.tablename,
  (xpath('/row/cnt/text()',
    query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', t.tablename),
                 false, true, '')
  ))[1]::text::int AS so_dong
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename LIKE '\_backup\_%'
ORDER BY 1;


-- ---------------------------------------------------------------------
-- BƯỚC 2 — XOÁ
-- ---------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE '\_backup\_%'
    ORDER BY tablename
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I', r.tablename);
    RAISE NOTICE 'Đã xoá %', r.tablename;
  END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Chạy lại BƯỚC 1: phải trả 0 dòng.
