-- =====================================================================
-- Rà soát: hai cột bản sao ngày HĐTD nằm trong LoanContracts
-- =====================================================================
--
-- LoanContracts giữ hai cột ContractStartDate / ContractEndDate là BẢN SAO
-- ngày hiệu lực của HĐTD cha (CreditContracts.ContractStartDate /
-- ContractEndDate). Mọi màn hình đã đọc ngày từ hợp đồng cha qua
-- hdtdEffectiveDatesOf (src/lib/creditContract.ts), nhưng bản sao thì:
--
--   * vẫn được form KUNN nạp lên và ghi xuống (src/lib/kunnForm.ts)
--   * vẫn là ĐƯỜNG DỰ PHÒNG khi KUNN không trỏ được về HĐTD cha
--     (creditLimit.ts, postLoanControl.ts, loanMath.ts, rateResolution.ts,
--      DashboardView, ScheduleTab, KunnTable)
--
-- Vì vậy XOÁ CỘT KHÔNG PHẢI VIỆC VÔ HẠI. Chạy hết bốn truy vấn dưới đây
-- trước khi quyết định — nếu §3 trả về khác 0 thì xoá cột là mất dữ liệu,
-- phải gỡ đường dự phòng trong mã trước.
--
-- Chạy trong SQL editor của Supabase, để ý ô Limit.
-- =====================================================================


-- §1. Đếm phân bố: KUNN nào có bản sao, có cha, khai lệch
-- ---------------------------------------------------------------------
select
  count(*)                                                          as tong_kunn,
  count(*) filter (where l."CreditContractId" is not null)           as co_cha,
  count(*) filter (where l."CreditContractId" is null)               as khong_cha,
  count(*) filter (where l."ContractStartDate" is not null
                      or l."ContractEndDate" is not null)            as co_ban_sao,
  count(*) filter (where c."Id" is not null
                    and (l."ContractStartDate" is distinct from c."ContractStartDate"
                      or l."ContractEndDate"   is distinct from c."ContractEndDate"))
                                                                     as ban_sao_lech
from "LoanContracts" l
left join "CreditContracts" c on c."Id" = l."CreditContractId";


-- §2. Liệt kê từng dòng lệch — đây là 4 dòng đã ghi trong PROGRESS.md
-- ---------------------------------------------------------------------
select
  l."Id",
  l."ContractNumber"        as so_kunn,
  c."HdtdNumber"            as so_hdtd,
  l."ContractStartDate"     as ban_sao_tu_ngay,
  c."ContractStartDate"     as hdtd_tu_ngay,
  l."ContractEndDate"       as ban_sao_den_ngay,
  c."ContractEndDate"       as hdtd_den_ngay,
  l."HdtdDueDate"           as hdtd_dao_han_khai_o_kunn,
  l."IsSettled"             as da_tat_toan
from "LoanContracts" l
join "CreditContracts" c on c."Id" = l."CreditContractId"
where l."ContractStartDate" is distinct from c."ContractStartDate"
   or l."ContractEndDate"   is distinct from c."ContractEndDate"
order by l."Id";


-- §3. CHẶN XOÁ CỘT: KUNN không có cha nhưng đang dựa vào bản sao
-- ---------------------------------------------------------------------
-- Mỗi dòng trả về là một khoản sẽ MẤT ngày nếu xoá hai cột, vì
-- hdtdEffectiveDatesOf trả null khi CreditContractId rỗng hoặc trỏ vào
-- hợp đồng không tồn tại. Khác 0 nghĩa là chưa được xoá cột.
select
  l."Id",
  l."ContractNumber"    as so_kunn,
  l."CreditContractId"  as tro_ve_hdtd_id,
  l."LoanMethod"        as phuong_thuc,
  l."ContractStartDate" as ban_sao_tu_ngay,
  l."ContractEndDate"   as ban_sao_den_ngay,
  l."DisbursementDate"  as ngay_giai_ngan,
  l."KunnDueDate"       as ngay_dao_han_kunn,
  l."HdtdDueDate"       as hdtd_dao_han_khai_o_kunn,
  l."IsSettled"         as da_tat_toan
from "LoanContracts" l
left join "CreditContracts" c on c."Id" = l."CreditContractId"
where c."Id" is null
  and (l."ContractStartDate" is not null or l."ContractEndDate" is not null)
order by l."IsSettled", l."Id";


-- §4. Sửa 4 dòng lệch cho khớp hợp đồng cha (chạy khi chọn hướng GIỮ CỘT)
-- ---------------------------------------------------------------------
-- Chỉ chạy sau khi đã xem §2 và đồng ý từng dòng. Bỏ comment để chạy.
--
-- update "LoanContracts" l
--    set "ContractStartDate" = c."ContractStartDate",
--        "ContractEndDate"   = c."ContractEndDate"
--   from "CreditContracts" c
--  where c."Id" = l."CreditContractId"
--    and (l."ContractStartDate" is distinct from c."ContractStartDate"
--      or l."ContractEndDate"   is distinct from c."ContractEndDate");
