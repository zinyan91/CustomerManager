---
id: huy-dong-cam-co
tieuDe: Huy động & Cầm cố sổ tiết kiệm
moTa: Quản lý sổ tiết kiệm của khách và khoản vay cầm cố sổ tiết kiệm, liên kết nhiều–nhiều, trả nợ trước hạn, đến hạn và tất toán sổ để cấn trừ
nhom: Hồ sơ tín dụng
tuKhoa: [huy động, tiền gửi, sổ tiết kiệm, stk, cầm cố, cầm cố sổ tiết kiệm, cctg, tất toán sổ, cấn trừ, giải chấp]
trang: [/savings-pledge]
nguon: [src/lib/savingsBook.ts, src/lib/pledgeLoan.ts, src/lib/pledgeLoanMath.ts, src/lib/savingsPledgeView.ts, src/hooks/useSavingsPledgeController.ts, supabase/migrations/76_huy_dong_cam_co.sql]
---
# Huy động & Cầm cố

Chọn khách hàng để xem hai tab: **Sổ tiết kiệm** và **Khoản vay cầm cố**. Khoản vay cầm cố sổ tiết kiệm không còn tạo ở màn Hợp đồng tín dụng.

## Sổ tiết kiệm
Mỗi sổ có số sổ, loại tiền gửi (VND, ngoại tệ, CCTG), số tiền, lãi suất, ngày gửi, kỳ hạn, phương thức lãnh lãi. Ngày đáo hạn tự tính từ ngày gửi và kỳ hạn.
- Khả năng bảo đảm: lãnh lãi cuối kỳ = gốc + lãi đến đáo hạn; lãnh lãi định kỳ hoặc lãnh trước = gốc − lãi đã chi; ngoại tệ = 90% gốc quy đổi.
- Còn trống để cầm cố = khả năng bảo đảm − nghĩa vụ (gốc + lãi đến hạn) của các khoản vay đang dùng sổ. Một khoản vay dùng nhiều sổ thì nghĩa vụ chia theo phần gốc mà từng sổ bảo đảm. Số âm tô đỏ.
- Sổ thiếu lãi suất, ngày gửi hoặc kỳ hạn hiện nhãn "Thiếu thông tin" và chưa tính được còn trống (thường gặp ở sổ chuyển từ TSBĐ cũ).

## Khoản vay cầm cố
Một số HĐ cầm cố kiêm luôn KUNN. Thời hạn theo số ngày tùy chọn, gốc và lãi trả một lần cuối kỳ. Lãi = gốc × lãi suất năm × số ngày / 365.
- Khi tạo, chọn một hoặc nhiều sổ và ghi phần gốc từng sổ bảo đảm; tổng phần gốc phải bằng số tiền vay.
- Cảnh báo (không chặn): ngày đến hạn vượt ngày đáo hạn sớm nhất của sổ; nghĩa vụ vượt khả năng bảo đảm của sổ.

## Trả nợ
- Trả trước một phần: thu lãi trên toàn bộ dư nợ tính đến ngày trả cộng phần gốc trả; kỳ sau tính lãi từ ngày trả trên dư nợ còn lại. Gốc trả phải lớn hơn 0 và nhỏ hơn dư nợ.
- Trả toàn bộ trước hạn: lãi tính đến ngày trả, khoản vay tất toán, các sổ được giải chấp.
- Trả khi đến hạn: gốc và lãi vào ngày đến hạn.
- Tất toán sổ để cấn trừ: tiền sổ (gốc + lãi) trừ nợ phải trả; dư thì trả khách, thiếu thì khách nộp thêm. Tất toán trước đáo hạn thì lãi sổ tính theo lãi suất không kỳ hạn 0,20%/năm.
- Trả sau ngày đến hạn: lãi trong hạn tính đến ngày đến hạn, cộng phạt quá hạn gốc 150% lãi suất và phạt chậm trả lãi 10%/năm.

## Chỗ dễ sai
- Không sửa được số tiền của khoản vay đã có lần trả nợ.
- Dư nợ cầm cố được cộng vào tổng dư nợ, nhóm nợ và phương thức "Cầm cố sổ tiết kiệm" trên Dashboard, cùng báo cáo đến hạn và báo cáo danh mục.
