# Quy ước giao diện làm việc

Cập nhật ngày 21/10/2026 theo yêu cầu tăng phân cấp và màu sắc. Quy ước có thể thay đổi theo nhu cầu sử dụng; ưu tiên trải nghiệm thực tế và xác nhận của người dùng hơn một phong cách cố định.

## Bố cục và nền

- Khung trang nối liền menu phụ, giữ chiều rộng làm việc. Không thêm lại nhiều lớp hộp lồng.
- Khung trang giữ góc vuông và nối liền menu phụ. KPI và thẻ số liệu bo 12px theo `--r-panel`, có viền màu và bóng cùng sắc rõ ở trạng thái thường; nút, ô nhập, viên trạng thái và hộp thoại giữ bán kính theo token. Không áp quy tắc bỏ bo góc của khung trang lên mọi thẻ con.
- Dùng `panel` cho dữ liệu, `surface` cho thanh lọc, `panel-muted` pha với `panel` cho tiêu đề bảng.
- Không xoá nền trạng thái hoặc kết quả khi làm phẳng panel. Chỉ bỏ bo góc, bóng và viền ngoài ở khung trang; thẻ KPI là ngoại lệ có bề mặt riêng.
- Giữ font, mật độ và định dạng số theo cấu hình người dùng.

## Màu mang ý nghĩa

Mở rộng sắc định danh từ dashboard sang KPI của các phân hệ. Không áp dụng giới hạn cũ “chỉ KPI dashboard được dùng màu định danh” trong hướng dẫn giao diện của skill `tin-dung`.

| Sắc | Vai trò |
| --- | --- |
| `accent` | Thao tác chính, quy mô tín dụng, dữ liệu đang chọn, hồ sơ đang xử lý |
| `kpi-cust` | Chỉ số khách hàng |
| `kpi-collateral` | Chỉ số tài sản bảo đảm hoặc huy động |
| `kpi-card` | Chỉ số thẻ |
| `pos` | Đạt, đang hoạt động, đã phê duyệt, đã giải ngân |
| `warn` | Cần chú ý, sắp hết hạn, chờ phê duyệt hoặc giải ngân |
| `neg` | Hết hiệu lực, thiếu bảo đảm, quá hạn hoặc lỗi |
| Trung tính | Lưu trữ, chưa có đánh giá, số lượng thông thường |

- KPI và thẻ số liệu dùng `data-metric-tone` để xác định sắc theo nghĩa, không theo vị trí. Nền pha màu 3% với `panel`, viền 1px pha 55% màu chỉ số với line; bóng hai tầng cùng màu ở mức 12% và 24%. Viền/bóng phải có sẵn ở trạng thái thường, không chỉ khi hover.
- Khi hover tăng viền cùng sắc; ô được chọn dùng viền màu đầy đủ, nền pha 6% và vòng ngoài cùng sắc 20%. Số/viền/bóng cảnh báo giữ đỏ hoặc vàng theo nghĩa, không đổi sang xanh. Focus bàn phím phải rõ và độc lập với trạng thái chọn.
- Dải thống kê co cột theo chiều rộng nội dung thực tế; dải có số tiền dài và icon dùng chiều rộng tối thiểu lớn hơn. Không dùng riêng breakpoint viewport để ép ba ô vào vùng nội dung hẹp bên cạnh menu.
- Riêng dải Danh sách khách hàng: bốn cột từ 1280px, hai cột bên dưới để tránh hàng lẻ. Số lớn theo `--fs-num`, icon riêng theo loại hồ sơ, icon nền đặc khi đang lọc; giữ thẻ KHLQ chỉ đọc.
- Trạng thái luôn có nhãn chữ. Màu bổ trợ cho nhãn, không thay thế nhãn.
- Tiêu đề và văn bản bảng giữ trung tính; không tô mọi số liệu thành nhiều màu. Nhãn KPI và đầu bảng dùng độ đậm vừa, không ép in hoa/giãn chữ rộng.
- Tab đang chọn dùng nền accent và chữ accent-ink. Bảng có nền tiêu đề và hover rõ; giữ trạng thái chọn dòng.
- Màu lấy từ token sáng/tối hiện có. Thêm hoặc đổi màu token phải đối chiếu `themeTokens.ts` và kiểm tra tương phản.
- Không thêm chữ phụ, tooltip, hiệu ứng chuyển động hoặc gradient chỉ để trang trí.

## Phạm vi kỹ thuật

CSS làm phẳng chỉ áp dụng trên màn hình, trong `.workspace-continuous`, loại trừ `.fixed` và `[role="dialog"]`. Thẻ KPI có selector riêng để giữ bo góc và bóng nhẹ. Không thay bố cục bản in hoặc màu của dialog.

Dashboard giữ bố cục, góc bo và nội dung hiện có; viền/bóng dùng cùng công thức màu thông qua `--kpi-hue`, không sửa cấu trúc thẻ để đồng bộ.
