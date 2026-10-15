---
id: lai-lich-tra-no
tieuDe: Lãi và lịch trả nợ
moTa: Cách tính lãi, lịch trả gốc lãi, lãi phạt, tất toán trước hạn, vì sao số lệch
nhom: Tính toán và lãi
tuKhoa: [lãi, lãi suất, lịch trả nợ, lịch thu nợ, tổng gốc, lãi phạt, tất toán, thu nhanh, niên kim]
trang: [/tools/calculators, /loans]
nguon: [src/lib/loanMath.ts, src/lib/calcMath.ts, src/lib/loanSettlement.ts, src/hooks/usePaymentModal.ts, src/components/portfolio/PaymentModal.tsx]
---
# Lãi và lịch trả nợ

Quản lý khoản vay (KUNN) giữ lịch thật; Công cụ tính toán chỉ để tính thử (chín công cụ).

## Lịch của khoản vay thật
- Lãi mỗi kỳ = dư nợ đầu kỳ × lãi suất năm × số ngày thực tế / 365, từ ngày giải ngân (hoặc đến hạn kỳ trước) đến ngày đến hạn. Có ưu đãi hoặc điều chỉnh lãi suất thì kỳ chia đoạn theo lãi suất, lãi cộng từng đoạn.
- Gốc: mặc định "Gốc trả cuối kỳ", chỉ kỳ cuối trả hết. Kiểu khác: gốc mỗi kỳ là số đã khai, hoặc tiền vay / (số kỳ trừ ân hạn gốc) làm tròn lên bội 10.000 đ. Kỳ ân hạn gốc không trả gốc; kỳ cuối trả hết dư nợ nên tổng gốc luôn bằng tiền vay.
- Trả trước một phần: chọn giảm gốc hàng tháng thì gốc các kỳ sau chia lại theo dư nợ và số kỳ còn lại; chọn rút ngắn kỳ hạn thì giữ gốc cũ.
- Ngày đến hạn: kỳ đầu là ngày trả đầu tiên sau ngày giải ngân; các kỳ sau cùng ngày mỗi tháng (tháng ngắn lấy ngày cuối tháng). Kỳ cuối đúng ngày đáo hạn đã khai, không có thì ngày giải ngân cộng kỳ hạn.
- Mở khoản vay thì lịch được tính lại: lãi kỳ chưa thu theo dư nợ thực tế; kỳ đã thu giữ lãi đã ghi.

## Quá hạn
- Gợi ý lãi phạt khi ghi nhận thu = gốc kỳ × lãi suất × 150% × ngày quá hạn / 365 (hệ số đặt riêng được theo khoản vay); người dùng sửa số cuối.
- Mở form và cột lãi phạt trong lịch chỉ tính phạt gốc. Đổi ngày thực trả hoặc số ngày quá hạn trong form thì gợi ý cộng thêm lãi chậm trả 10%/năm trên lãi kỳ đó.

## Nút trên lịch trả nợ
- Thu nhanh: ghi nhận mọi kỳ chưa thu đã đến hạn, kể cả quá hạn, ngày thu là ngày đến hạn từng kỳ. Lãi phạt về 0; số thu là số đã khai, chưa khai thì bằng gốc và lãi theo lịch.
- Tất toán trước hạn: phải thu = dư nợ gốc còn lại + lãi dồn tích (từ ngày bắt đầu tính lãi của kỳ hiện tại đến ngày tất toán, ngày/365) + phí trả trước hạn (% × dư nợ gốc, mặc định 0). Các kỳ sau bị cắt. Không làm được nếu đã tất toán, hết dư nợ, hoặc ngày tất toán trước ngày bắt đầu tính lãi.
- Thu nhanh từng kỳ ở Tổng quan: chỉ kỳ chưa quá hạn, chưa khai trả trước hay số thu; ngày thu là hôm nay.

## Chỗ dễ sai
- Niên kim trong công cụ tính lãi mỗi kỳ = dư nợ × lãi suất / 12, không theo ngày thực tế; lịch khoản vay thật theo ngày/365 nên hai nơi lệch nhau.
- Làm tròn lên 10.000 đ làm gốc không chia hết đều; kỳ cuối nhận phần dư.
- Đổi ngày giải ngân hoặc đáo hạn khi đã có lịch thì phải tính lại lịch mới dời ngày kỳ chưa thu.
