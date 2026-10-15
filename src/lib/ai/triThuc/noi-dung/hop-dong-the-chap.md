---
id: hop-dong-the-chap
tieuDe: Hợp đồng thế chấp (HĐTC)
moTa: Ghi nhận hợp đồng thế chấp, công chứng và đăng ký, liên kết tài sản và HĐTD, giải chấp, xóa
nhom: Hồ sơ tín dụng
tuKhoa: [hợp đồng thế chấp, hdtc, thế chấp, giải chấp, công chứng, đăng ký giao dịch bảo đảm, gdbđ, bên thế chấp]
trang: [/mortgage-contracts]
nguon: [src/lib/mortgageContract.ts, src/hooks/useMortgageContractController.ts, src/components/mortgage/MortgageContractForm.tsx, src/components/mortgage/MortgageContractToolbar.tsx, src/components/mortgage/MortgageContractTable.tsx]
---
# Hợp đồng thế chấp

Chọn khách hàng (tìm theo tên, CIF, SĐT) để xem và nhập HĐTC của khách đó. Bảng liệt kê Số HĐTC, Ngày ký, Bên thế chấp, Giá trị bảo đảm tối đa, Tài sản, HĐTD được bảo đảm, Trạng thái.

## Danh sách
"Tìm HĐTC" theo số HĐTC hoặc bên thế chấp (không phân biệt dấu). "Lọc trạng thái": Đang hiệu lực, Đã giải chấp, Tất cả. "Thêm HĐTC" mở form.

## Form
- Hợp đồng: Số HĐTC (bắt buộc), Ngày ký, Bên thế chấp (để trống nếu là chính khách hàng; bảng hiện "Chính khách hàng"), Giá trị bảo đảm tối đa (không âm).
- Công chứng và đăng ký giao dịch bảo đảm: số, ngày, tổ chức công chứng; ngày và cơ quan đăng ký GDBĐ.
- Tài sản và HĐTD được bảo đảm: chọn trong các tài sản bảo đảm và hợp đồng tín dụng của khách. Khách chưa có tài sản hay HĐTD thì danh sách trống, phải tạo ở màn tương ứng trước. HĐTD đã đóng vẫn chọn được và có nhãn "(Đã đóng)".
- Giải chấp: đánh dấu "Đã giải chấp" thì bắt buộc có ngày giải chấp, và không được trước ngày ký.

## Quy tắc
- Số HĐTC không trùng trong cùng một khách hàng (không phân biệt hoa thường). Khác khách hàng thì được trùng.
- Chỉ xóa được HĐTC đã giải chấp; chưa giải chấp thì nút Xoá báo "Chưa giải chấp nên chưa xoá được".
- Tài sản đang nằm trong HĐTC thì không xóa được tài sản; HĐTD đang được HĐTC bảo đảm thì không xóa được HĐTD. Phải gỡ khỏi HĐTC trước.
- Số HĐTC của tài sản và của HĐTD hiện ở màn Định giá TSĐB và màn Hợp đồng tín dụng.

## Chỗ dễ sai
Khách không hiện tài sản hay HĐTD trong form thường vì chưa nhập ở màn Định giá TSĐB hoặc Hợp đồng tín dụng, hoặc đang chọn nhầm khách hàng.
