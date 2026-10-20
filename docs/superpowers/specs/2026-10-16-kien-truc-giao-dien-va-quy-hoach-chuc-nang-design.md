# Kiến trúc điều hướng CustomerManager

Cập nhật: 20/10/2026. [Mockup điều hướng](./2026-10-16-mockup-kien-truc-giao-dien-moi.html).

## 1. Phạm vi đã chốt

**Lần này chỉ thay đổi điều hướng. Giữ nguyên toàn bộ giao diện bên trong mọi chức năng, bao gồm Dashboard.**

Không thay KPI, biểu đồ, bảng dữ liệu, bộ lọc, biểu mẫu, nút nghiệp vụ, xuất Excel/PDF, luồng thu nợ hoặc bố cục của các màn hiện có. Không dựng lại hay rút gọn Dashboard. Không sửa dữ liệu, công thức tài chính, API hoặc quyền trên máy chủ.

Đã ghép lớp điều hướng trong `src/` để kiểm tra cục bộ; chưa deploy production. Trong mockup, mỗi điểm đến chỉ có liên kết mở màn hiện tại ở tab riêng. Không nhúng ứng dụng thật, không dựng UI chức năng thay thế, không thực hiện giao dịch mô phỏng. Ngữ cảnh khách hàng chỉ phục vụ thử điều hướng; ID mẫu không được đưa vào liên kết tới ứng dụng thật.

### Điều chỉnh được yêu cầu sau khi ghép

Hai khung Phương thức vay và Nhóm nợ được trả về hàng rộng dưới KPI, theo vị trí trong Dashboard trước commit 77fff53. Khung cảnh báo HĐTD và bảng tác nghiệp dùng đủ chiều ngang, không bó trong cột phải. Bỏ khung Lối tắt tác vụ thường dùng. Menu phụ desktop chỉ hiện nhóm hiện hành; bỏ nút Tất cả chức năng và trạng thái chuyển sang danh sách phẳng. Điện thoại vẫn chọn nhóm bằng menu từ header. Các nội dung/số liệu/công thức khác giữ nguyên.
## 2. Kết quả ghép vào mã hiện tại

- `src/lib/workspaceNavigation.ts` đọc danh mục từ `navigation.ts` và `hubTasks.ts`, lấy URL từ các nguồn hiện có, chỉ bổ sung cách phân nhóm. Không tạo route hoặc mô hình quyền mới.
- PrimaryRail, Sidebar và CommandPalette cùng dùng danh mục này. Phân giải được URL `/tools/...`, URL theo khách hàng và alias Hub; không còn các bảng tiền tố rời nhau.
- Menu phụ hiển thị phân hệ hiện hành trên desktop; menu điện thoại và lớp phủ ở màn chuyên dụng hiển thị tất cả chức năng được phép.
- Bỏ LifecycleStepper khỏi vỏ trang để tránh ba tầng điều hướng lặp nhau. Liên kết menu phụ đã giữ ngữ cảnh khách hàng theo URL, không cần thêm một hàng tab hồ sơ.
- Hub, Văn thư và Kho tệp giữ bố cục chuyên dụng; header có thêm nút mở cùng menu điều hướng. Office và Admin giữ không gian riêng như trước.
- Mặc định menu phụ thu gọn khi lần đầu mở ở màn dưới 1200px; vẫn nhớ lựa chọn thu/mở của người dùng.
- Dashboard chỉ sửa hai dấu đóng JSX sai để biên dịch được: thêm `)}` sau bảng TSBĐ và bỏ một `</div>` thừa. Không đổi nội dung, class, props hoặc tính toán nghiệp vụ của Dashboard.

Không dùng số liệu chưa đo như “giảm 75% tải nhận thức”. Không giới hạn máy móc số mục trong mỗi nhóm.

## 3. Bố cục điều hướng

Bản ghép chọn Rail + menu phụ. Phương án tab phân hệ chỉ còn trong mockup để tham khảo.

| Khu vực | Quy tắc |
|---|---|
| Rail | Rộng 88px để đọc nhãn đầy đủ; nhóm dài có thể xuống hai dòng, không cắt chữ |
| Menu phụ | Rộng 220px trên desktop từ 768px, có nút thu gọn; nhãn khoản vay là “Quản lý khoản vay” |
| Laptop 768–1199px | Lần đầu mặc định thu menu; dùng nút trên Rail để mở, vẫn nhớ lựa chọn |
| Điện thoại dưới 768px | Giữ header hiện tại; nút menu mở toàn bộ chức năng theo nhóm trong lớp phủ |
| Bàn phím | Focus rõ ràng, Escape đóng menu, giữ focus trong menu khi mở trên màn hẹp |
| Tìm kiếm | Ctrl/Command K; tìm chức năng và tác vụ Hub theo quyền, giữ khách hàng khi chọn màn hồ sơ |

Hình thức chỉ áp dụng cho vỏ điều hướng: rail xanh than, nền Slate phân lớp, viền và bóng nhẹ, icon SVG cùng hệ nét. Có Sáng/Tối, không phụ thuộc font/CDN, không ghi đè CSS của nội dung chức năng.

Điều chỉnh 20/10/2026: Dự toán, Tài liệu, Tra cứu, Phân tích và Báo cáo Excel dùng nền liền menu phụ, không padding ngoài hoặc chiều rộng tối đa căn giữa. Các vùng có `data-workspace-panel` bỏ góc tròn, bóng và viền bao, phân cách bằng đường kẻ dưới. CSS chỉ áp dụng trong `.workspace-continuous` ở màn hình; loại trừ cửa sổ fixed/dialog, không đổi ô nhập, nút hoặc HTML xuất/in. Office vẫn dùng editor riêng.

## 4. Danh mục chung

| Nhóm | Đích đến |
|---|---|
| Tổng quan | Dashboard hiện tại, Team & KPI, Báo cáo tiến độ, Báo cáo (/office), Báo cáo Excel |
| Tín dụng | Khách hàng, HĐTD, TSBĐ, HĐTC, giải ngân, KUNN, thẻ, KSSV |
| Phân tích | BCTC, PAKD, TOI, công cụ tính, chào lãi suất, COF |
| Hồ sơ chứng từ | Cây bộ hồ sơ và biểu mẫu |
| Quản lý văn thư | Trang Văn thư, mở trực tiếp từ rail |
| Kho lưu trữ | Trang Kho lưu trữ, mở trực tiếp từ rail |
| Dự toán & hàng hóa | Dự toán, mua sắm, bán lẻ, thu mua, kho hàng |
| Tra cứu | MĐSDV, chính sách thẻ, ôn tập |
| Cài đặt | Cài đặt cá nhân; quản trị người dùng khi có quyền |

Bản mockup dùng `architecture-mockup-model.js`; bản React dùng `workspaceNavigation.ts` để ghép hai danh mục hiện có. Rail, menu và tìm kiếm đọc chung kết quả lọc quyền. Các URL và quyền vẫn được quyết định bởi `routes.ts`, `customerRoutes.ts`, `hubTasks.ts` và `modules.ts`.

Nguồn điều hướng dùng `src/lib/navigation.ts`, `routes.ts`, `customerRoutes.ts` và mô hình module. Giữ URL cũ và alias Hub. Tác vụ Hub, Văn thư và Kho lưu trữ dùng AppLayout cùng rail/menu phụ; Office và Quản trị giữ bố cục chuyên dụng. Bỏ mục Danh mục; `/hub` chuyển tới chức năng tra cứu đầu tiên được cấp, hoặc chức năng được phép khác. Lọc từng chức năng theo quyền, bỏ nhóm rỗng; nút nhóm mở chức năng đầu tiên được phép. Dashboard thuộc module `credit`, không ép mọi tài khoản vào đó.

Hồ sơ chứng từ là tab riêng trên rail, dùng cây bộ hồ sơ thay cho menu phụ thông thường. Cây nằm trong cột 220px ngay cạnh rail; vùng nhập/xem trước bắt đầu từ mép cây. Không thêm cột điều hướng hoặc ô chọn ngang. Thu/mở cây dùng chung trạng thái với rail; lựa chọn gồm giấy tờ tùy chọn nằm trên cây, giữ trước/sau và dữ liệu riêng từng bộ. Điện thoại mở cây bằng nút trong workspace, chọn biểu mẫu sẽ đóng cây; menu trên header vẫn chuyển được phân hệ.

Văn thư và Kho lưu trữ tách thành hai tab chính, bỏ nhóm Tài liệu. Hai trang dùng điều hướng nội bộ sẵn có, main bắt đầu ngay cạnh rail (x88), không thêm menu phụ chỉ chứa một mục. Header điện thoại vẫn mở toàn bộ chức năng theo quyền. Báo cáo (/office) nằm trong nhóm Tổng quan nhưng giữ editor riêng khi mở.

Báo cáo Excel (/hub/reports) gom thao tác xuất từ Dashboard và Danh sách khách hàng theo yêu cầu bổ sung. Hai nhóm ngang: Theo dõi đến hạn (kỳ due, KUNN, HĐTD, định giá TSBĐ; xem trước và xuất Excel/In-PDF chung bộ lọc) và Danh mục & tổng hợp (nút danh mục đang vay đầy đủ hai sheet, năm báo cáo tổng hợp xuất gộp). Bỏ ReportRail bên trong và nút xuất tại hai màn cũ. Bộ chọn cảnh báo được dùng chung với Dashboard; không đổi phạm vi cảnh báo cũ. Tài khoản có credit hoặc tools mở được trang; quyền dữ liệu vẫn theo RLS và phạm vi tài khoản hiện tại.

## 5. Ngữ cảnh và tab hồ sơ

Bản React dùng menu phụ để chuyển HĐTD, TSBĐ, HĐTC, KUNN, thẻ và KSSV; bỏ stepper trong AppLayout. Tab hồ sơ chỉ là phương án trong mockup, không ghép thêm vào React. Thẻ không phải bước bắt buộc sau giải ngân.

- Đổi mục hồ sơ trong menu hoặc bảng lệnh giữ khách hàng theo URL. Bộ đổi khách hàng hiện tại không thay đổi.
- Mở link trực tiếp hoặc Back/Forward khôi phục đúng màn và khách hàng.
- Màn toàn danh mục và Cài đặt không hiện khách hàng cố định.
- Không sửa nội dung, biểu mẫu hoặc cách xử lý nghiệp vụ của bất kỳ màn nào để phục vụ cơ chế điều hướng.
- Tham số `?customerId=` cho phân tích trong mockup chỉ minh họa trạng thái; cần chốt với controller hiện tại trước khi triển khai thật.
- Bảo vệ dữ liệu đang sửa phải tích hợp với cơ chế hiện tại của từng màn, không thay biểu mẫu hoặc luồng lưu trong đợt đổi điều hướng.

## 6. Cấu trúc và kiểm chứng

| Tệp | Vai trò |
|---|---|
| HTML | Khung điều hướng, bộ chọn bố cục/quyền/giao diện và hộp tìm kiếm |
| `architecture-mockup.css` | Hình thức vỏ điều hướng và responsive |
| `architecture-mockup-model.js` | Danh mục, dữ liệu ngữ cảnh mẫu, URL và quyền |
| `architecture-mockup-views.js` | Dựng điều hướng, breadcrumb, tab và liên kết màn hiện tại |
| `architecture-mockup-controller.js` | Điều phối chuyển trang, lịch sử, tìm kiếm và menu |
| `architecture-mockup-check.mjs` | Kiểm tra URL, quyền, phạm vi khách hàng, bàn phím và việc không dựng lại UI chức năng |

Mở trực tiếp HTML cùng các tệp đi kèm. Chạy kiểm tra từ gốc repo: `node docs/superpowers/specs/architecture-mockup-check.mjs`.

Bản ghép kiểm tra bằng unit/integration test cho URL, tất cả tổ hợp module, menu, tìm kiếm và ngữ cảnh. Kiểm tra Edge headless dùng bản build React thật, session và API giả bị chặn ở lớp mạng; không đọc hoặc ghi production. Giữ năm KPI, toàn bộ bảng/bộ lọc/cơ cấu/lối tắt của Dashboard. Kiểm máy tính 1440px, laptop 1024px và điện thoại 390px, cả giao diện Sáng/Tối. Chưa đo thời gian tìm chức năng với người dùng và chưa deploy.

Build được xuất vào `.tmp/build-last` để tránh ACL chặn việc dọn `dist/assets`; không thay cấu hình build của dự án. Trước deploy cần build lại và xác nhận deployment Ready theo quy tắc repo.
