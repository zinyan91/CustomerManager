---
id: nhom-no
tieuDe: Nhóm nợ và kiểm soát sau vay
moTa: Cách xác định nhóm nợ từ ngày quá hạn, vì sao nhóm nợ mỗi màn một khác, các đợt kiểm soát sau vay
nhom: Tính toán và lãi
tuKhoa: [nhóm nợ, quá hạn, ngày quá hạn, nợ xấu, phân loại nợ, kiểm soát sau vay, kssv, kiểm tra sau vay]
trang: [/post-loan-control]
nguon: [src/lib/loanMath.ts, src/lib/customerContext.ts, src/lib/postLoanControl.ts, src/components/portfolio/KunnTable.tsx, src/components/views/DashboardView.tsx, src/components/views/PostLoanControlView.tsx, src/hooks/usePostLoanControlController.ts]
---
# Nhóm nợ và kiểm soát sau vay

## Xác định nhóm nợ
Lấy số ngày quá hạn lớn nhất trong các kỳ chưa thu đủ của khoản vay (hôm nay trừ ngày đến hạn):
- dưới 10 ngày: nhóm 1
- 10 đến 90 ngày: nhóm 2
- 91 đến 180 ngày: nhóm 3
- 181 đến 360 ngày: nhóm 4
- trên 360 ngày: nhóm 5

Khoản đã tất toán luôn là nhóm 1.

## Mỗi màn lấy nhóm nợ một kiểu
- Bảng khoản vay (KUNN) và Tổng quan: lấy nhóm cao hơn giữa nhóm đã lưu và nhóm tự tính từ ngày quá hạn.
- Thanh thông tin khách hàng: chỉ dùng nhóm tự tính, trên các kỳ quá hạn của những khoản vay còn hoạt động. Khách không còn dư nợ hoặc không có khoản vay đang hoạt động thì là nhóm 1. 
- Tổng quan coi kỳ chưa đánh dấu đã thu là chưa trả, không xét thu một phần; phần tự tính ở bảng khoản vay thì xét thu đủ gốc, lãi và lãi phạt.

## Nhóm đã lưu hay cũ
Nhóm lưu trong hồ sơ chỉ được cập nhật khi có thao tác: lưu khoản vay, ghi nhận thu, thu nhanh, tính lại lịch (đều ghi đè bằng nhóm tự tính) và tất toán (về nhóm 1). Kỳ trôi qua hạn mà không ai thao tác thì nhóm lưu vẫn cũ, nên các màn lấy giá trị cao hơn với nhóm tự tính. Ô nhóm nợ chọn tay trong form khoản vay không giữ được: lưu xong thì bị thay bằng nhóm tự tính.

## Kiểm soát sau vay
Màn này tự sinh danh sách đợt kiểm tra cho khoản vay chưa tất toán:
- Mục đích sử dụng vốn: 30 ngày sau ngày giải ngân, mỗi khoản vay một đợt.
- Kiểm tra sau vay: 3 tháng một lần, tính từ ngày giải ngân sớm nhất của nhóm khoản vay cùng khách và cùng hợp đồng tín dụng, đến ngày đáo hạn muộn nhất hoặc hết 12 tháng tới, tùy ngày nào đến trước.
- Hiện trạng tài sản: 12 tháng một lần kể từ ngày định giá (chọn 6 hoặc 12 tháng ở ô "Chu kỳ kiểm tra TSĐB"), cho tài sản đang gắn với khoản vay chưa tất toán, trong 12 tháng tới.
- Trạng thái: quá hạn khi đã qua ngày đến hạn; sắp đến hạn khi còn 30 ngày trở xuống; còn lại là sắp tới. Đợt đã ghi nhận hiện ở "Đã thực hiện".
- Ghi nhận bắt buộc có ngày thực hiện; kết luận mặc định là Đạt. Đợt kiểm tra tài sản có thể định giá lại ngay trong đợt đó.
