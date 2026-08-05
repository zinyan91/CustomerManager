-- =====================================================================
-- Chặn đóng HĐTD khi còn KUNN chưa tất toán
-- =====================================================================
-- Quyết định nghiệp vụ 05/08/2026: không ngân hàng nào tất toán hợp đồng
-- khi còn dư nợ. Trạng thái "IsClosed = true mà còn KUNN chưa tất toán"
-- là DỮ LIỆU SAI, không phải tình huống nghiệp vụ cần hiển thị.
--
-- Chốt ở client (canCloseCreditContract) không phải lớp bảo vệ: dưới RLS
-- client chỉ thấy phần dữ liệu của mình, và mọi đường ghi bằng SQL đều đi
-- vòng qua nó. Lớp bảo vệ thật là trigger dưới đây.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — RÀ SOÁT: những dòng đang ở trạng thái sai
-- ---------------------------------------------------------------------
-- Chạy trước khi tạo trigger. Trigger chỉ chặn thao tác MỚI, không sửa
-- ngược dữ liệu cũ.

SELECT
  cc."Id"                AS hdtd_id,
  cc."HdtdNumber",
  c."FullName",
  count(l."Id")          AS kunn_chua_tat_toan,
  sum(coalesce(l."CurrentBalance", l."LoanAmount", 0)) AS du_no_ghi_nhan
FROM public."CreditContracts" cc
JOIN public."Customers" c ON c."Id" = cc."CustomerId"
JOIN public."LoanContracts" l
  ON l."CreditContractId" = cc."Id" AND l."IsSettled" IS NOT TRUE
WHERE cc."IsClosed" IS TRUE
GROUP BY 1, 2, 3
ORDER BY 5 DESC;


-- ---------------------------------------------------------------------
-- BƯỚC 2 — TRIGGER
-- ---------------------------------------------------------------------
-- Chỉ kiểm khi hợp đồng CHUYỂN sang đóng, để các dòng sai sẵn có vẫn
-- sửa được trường khác mà không bị chặn oan.

CREATE OR REPLACE FUNCTION public.chan_dong_hdtd_con_du_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  so_kunn integer;
  ds_kunn text;
BEGIN
  IF NEW."IsClosed" IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."IsClosed" IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT count(*), string_agg("ContractNumber", ', ' ORDER BY "ContractNumber")
    INTO so_kunn, ds_kunn
  FROM public."LoanContracts"
  WHERE "CreditContractId" = NEW."Id" AND "IsSettled" IS NOT TRUE;

  IF so_kunn > 0 THEN
    RAISE EXCEPTION
      'Không đóng được HĐTD %: còn % KUNN chưa tất toán (%)',
      NEW."HdtdNumber", so_kunn, ds_kunn
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chan_dong_hdtd_con_du_no ON public."CreditContracts";

CREATE TRIGGER trg_chan_dong_hdtd_con_du_no
  BEFORE INSERT OR UPDATE OF "IsClosed" ON public."CreditContracts"
  FOR EACH ROW
  EXECUTE FUNCTION public.chan_dong_hdtd_con_du_no();


-- ---------------------------------------------------------------------
-- BƯỚC 3 — CHẶN ĐƯỜNG NGƯỢC: tất toán KUNN của HĐTD đã đóng
-- ---------------------------------------------------------------------
-- Không cần chặn: tất toán KUNN trên HĐTD đã đóng là việc PHẢI làm để
-- dọn các dòng sai sẵn có. Đóng hợp đồng rồi mới giải ngân thêm thì đã
-- bị chặn ở computeLimitGroups và summarizeCreditContracts.


-- ---------------------------------------------------------------------
-- BƯỚC 4 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Chạy lại BƯỚC 1: số dòng không tăng so với lần chạy đầu.
--
-- Thử nghiệm trigger trên một HĐTD còn KUNN chưa tất toán — câu này PHẢI
-- báo lỗi check_violation, thay <id> bằng hdtd_id lấy từ BƯỚC 1:
--
--   UPDATE public."CreditContracts" SET "IsClosed" = true WHERE "Id" = <id>;
--
-- Các dòng đã sai ở BƯỚC 1 xử lý theo quyết định nghiệp vụ: mở lại hợp
-- đồng (IsClosed = false) nếu khoản vay còn chạy thật, hoặc tất toán từng
-- KUNN nếu khách đã trả hết mà chưa ai đánh dấu. KHÔNG sửa hàng loạt.
