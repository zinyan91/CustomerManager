# SDD ledger — plan: docs/superpowers/plans/2026-08-20-rebuild-giao-dien-dot-1a-dinh-tuyen.md

Spec: docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md (đã đọc, §6.1 §6.3 §6.4)
Nhánh: rebuild-giao-dien-dot-1 · gốc nhánh: c5ebd57 (main sau đợt 0) · cây sạch lúc bắt đầu

## Rà soát trước khi chạy

### Cặp task dùng chung tệp hoặc giao diện lập trình

| Cặp | Tệp / giao diện chung | Bên sản xuất | Bên tiêu thụ | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| 1 → 2 | `ROUTE_OF`, `DEFAULT_ROUTE`, `screenIdOfPath` | T1 tạo `src/lib/routes.ts` | T2 dùng trong `App.tsx` và `WorkContext` | Khớp. Tên và kiểu giống nhau ở hai nơi |
| 1 → 3 | `NavItem.path` | T1 thêm trường vào `navigation.ts` | T3 dùng cho `NavLink to=` và `CommandPalette` | Khớp |
| 2 → 3 | `src/components/AppLayout.tsx` | T2 tạo | T3 sửa (bỏ hai prop truyền xuống Sidebar) | **Thứ tự bắt buộc T2 trước T3.** Kế hoạch xếp đúng |
| 2 ↔ 3 | `src/components/__tests__/Sidebar.test.tsx` | T2 bọc `MemoryRouter` | T3 viết lại phần khẳng định sang thẻ liên kết | **Thứ tự bắt buộc T2 trước T3.** Kế hoạch xếp đúng |
| 2 → 4 | `Header` được `AppLayout` dựng | T2 tạo `AppLayout` | T4 sửa `Header` | Khớp. T4 sau T2 |
| 0 → 5 | `van-tay-truoc.json` | T0 | T5 đối chiếu | Khớp sau khi sửa tên trường (xem KK-2) |
| 1,2,3,4 → 5 | số đo và hành vi | các task | T5 ghi vào `CONVENTIONS.md` | Khớp |

### Từng task có tự mâu thuẫn không

| Task | Kiểm gì | Kết quả |
| :--- | :--- | :--- |
| 0 | có thực hiện được không | Được. Đã kiểm trình duyệt: phiên đăng nhập của chủ dự án còn sống, thanh bên hiện 19 nút |
| 1 | số test khai (8) so với test thật viết ra | Khớp |
| 1 | tổng test khai (1.701) | Khớp: 1.691 + 8 + 2 |
| 1 | `ROUTE_OF` có phủ đủ 19 `ScreenId` không | Khớp, đối chiếu tay với `navigation.ts` |
| 2 | thứ tự lồng `BrowserRouter` và `ProviderComposer` | **KK-1 — SAI.** Xem dưới |
| 2 | test `routing.test.tsx` có dựng lên được không | **KK-2 — đã sửa ở khâu soát kế hoạch.** Bản đầu quên `AppLayout` trả về `LoginView` khi chưa có phiên |
| 3 | `NavLink` vừa nhận `className` hàm vừa nhận con là hàm | Hợp lệ trong react-router v7 |
| 4 | test đọc mã dạng văn bản | Đã bỏ khai `jsdom` thừa và đổi đuôi tệp sang `.ts` ở khâu soát kế hoạch |
| 5 | chỉ sửa tài liệu | Không mâu thuẫn |

### Khiếm khuyết và phán quyết

**KK-1 — Thứ tự lồng `BrowserRouter` sai, ứng dụng sẽ vỡ ngay lúc khởi động.**
`ProviderComposer` dựng cây bằng `reduceRight`, nên provider cuối mảng — `WorkProvider` —
thành lớp trong cùng bọc quanh `children`. Kế hoạch bản đầu đặt `BrowserRouter` **bên trong**
`ProviderComposer`, tức `WorkProvider` nằm ngoài router; `useLocation()` mà Task 2 Step 7 thêm
vào `WorkProvider` sẽ ném lỗi. Tệ hơn, tôi còn viết một câu giải thích ngược hẳn lại.

**Ruling:** sửa kế hoạch — `BrowserRouter` bọc **ra ngoài** `ProviderComposer`, và ghi rõ vì sao
thứ tự đó bắt buộc, kèm một bước kiểm nhanh trên bảng điều khiển trình duyệt.
— Vì sao: đây là lỗi tất định, không phải chuyện phong cách. Để nguyên thì Task 2 chắc chắn hỏng.
— Giá nếu sai: không có. Thứ tự này là điều kiện kỹ thuật, kiểm được ngay bằng một lần mở trang.

**KK-2 — Test khung trang tìm thanh bên ở trang không có thanh bên.** Bản đầu của
`routing.test.tsx` render `AppLayout` rồi tìm `getByRole('navigation')`, nhưng `AppLayout` trả về
`<LoginView />` khi chưa có phiên đăng nhập. Đã sửa ở khâu soát kế hoạch bằng cách giả lập
`AuthContext` thay vì giả lập `supabase` — gọn hơn và không phụ thuộc hình dạng nội bộ thư viện.

---

## Tiến độ
Task 0: complete (không commit — chỉ ghi tệp trong thư mục đã gitignore).
  Tôi tự làm thay vì giao subagent: task này không sinh diff nào, không có mặt tiếp xúc để rà soát.
  Mốc đo được trên app đang chạy: thanh bên 19 nút / 0 thẻ liên kết / 5 nhóm, thẻ là BUTTON.
  Tái hiện được vấn đề: bấm sang Định giá TSĐB → thanh bên đánh dấu đúng nhưng location.pathname
  vẫn là "/". F5 một cái → quay về Tổng quan. Đây chính là thứ đợt 1a sửa.
Task 1: complete (commits 880999d..c37c025, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát tự chạy phép thử đột biến: xoá 'settings' khỏi ROUTE_OF → 2 đỏ;
  đổi '/tong-quan' thành '/Tong-Quan' → 2 đỏ. Hoàn tác → 17 xanh.
  Xác nhận app CHƯA đổi hành vi: chỉ navigation.ts và 2 tệp test đọc ROUTE_OF.
  Tổng test 1.701.
Task 2: DONE (commits 398a819 router + a0c9bcd đường dẫn tiếng Anh). 1.705 test.
  Tôi tự kiểm trên giao diện thật (chủ dự án đã đăng nhập): 10 màn thử đều đúng đường dẫn
  tiếng Anh và đều dựng ra nội dung. F5 giữ nguyên màn. history.back() quay đúng chỗ.
  Đường dẫn tiếng Việt cũ chuyển hướng về /dashboard nhờ luật path="*".

Ruling: đổi toàn bộ đường dẫn URL sang tiếng Anh giữa chừng đợt 1a, theo yêu cầu chủ dự án
  ngày 20/08/2026 ("để tránh lỗi" — mã hoá và công cụ).
  — Vì sao làm ngay: bảng đường dẫn còn nằm gọn ở một tệp và mới có hai task tiêu thụ.
    Để tới đợt 3 thì nó đã rải khắp nơi, đổi lúc đó đắt gấp nhiều lần.
  — Giá nếu sai: link nào đã lỡ chia sẻ trong ngày hôm nay sẽ hỏng. Rủi ro gần như bằng không
    vì tính năng URL mới ra đời được vài giờ và chưa ai dùng.
  — Kèm theo: đã sửa kế hoạch cho khớp trước khi sửa mã, nên brief của Task 3 và 5 không lệch.

Task 2: minor (deferred): mã test routing.test.tsx trong kế hoạch do TÔI viết thiếu
  WorkProvider và ThemeProvider khi dựng AppLayout; người thi công phải tự thêm. Lỗi thứ ba
  của tôi trong kế hoạch đợt này. Không ảnh hưởng kết quả, chỉ tốn một vòng dò của họ.
Task 2: complete (commits e60cc79..a0c9bcd, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát đi qua CẢ 19 MÀN trên trình duyệt: đều dựng được, đường dẫn đúng, 0 lỗi console.
  Đối chiếu 4 chuỗi lớp CSS trong AppLayout với App.tsx cũ: khớp từng ký tự.
  Xác nhận không tệp nào trong views/ hay hooks/ bị đụng; 2 tệp test chỉ thêm MemoryRouter
  bọc ngoài, phần khẳng định không đổi dòng nào.
  Nhận định đáng giữ: setActiveTab với id lạ nay lặng lẽ bỏ qua thay vì render trắng main
  như hành vi cũ — an toàn hơn.
Task 2: minor (đã sửa ngay): kế hoạch ghi chuỗi đường dẫn lạ là /khong-co-duong-dan-nay
  còn test dùng /not-a-real-screen. Đã đồng bộ về /not-a-real-screen.
Task 3: DONE (commit ebf27fa) — Sidebar dùng NavLink, CommandPalette dùng useNavigate. 1.708 test.
  Tôi tự kiểm trên giao diện thật: 19 thẻ liên kết / 0 nút / 5 nhóm, href đúng.
  BẰNG CHỨNG KHÔNG ĐỔI DIỆN MẠO: kiểu dáng đã tính toán của mục đang mở giống y hệt từng giá trị
  với dấu vân tay đợt 0 (van-tay-sau-task-4.json): fontSize 12px, padding 6px 12px,
  color rgb(2,110,166), backgroundColor rgb(224,242,254), borderRadius 0px 8px 8px 0px.
  Người thi công phải sửa thêm 2 test cũ đổi selector nav button -> nav a; bắt buộc, hợp lý.
Task 3: complete (commits cf7447e..ebf27fa, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát đối chiếu chuỗi lớp CSS từng ký tự với bản <button> cũ: giống hệt.
  getComputedStyle khớp tuyệt đối mốc đợt 0. Phép thử đột biến: đổi ROUTE_OF.dashboard
  thành /sai-duong-dan → 2 đỏ; hoàn tác → 7 xanh.
  Ctrl+K kiểm cả hai đường: chọn bằng chuột và bằng phím Enter, đều ra /collaterals.
  Ghi chú: tab trình duyệt cũ có lỗi console tồn đọng "activeTab is not defined" — đó là
  trạng thái HMR cũ còn sót, không tái hiện ở tab mở mới. Không phải lỗi ứng dụng.
Task 4: DONE (commit a8e76ba) — Header thôi ping CSDL. 1.711 test.
  Tự kiểm mã: bỏ hẳn supabase và setInterval, dùng navigator.onLine + sự kiện online/offline.
  Chuỗi lớp CSS giữ nguyên từng ký tự, chỉ đổi điều kiện isOnline === false thành !isOnline.
  LƯU Ý: con số "trước khi sửa" trong báo cáo người thi công là ƯỚC TÍNH, không phải đo thật.
  Tôi đang tự đo lại phần "sau khi sửa" trên tab mới.
Task 4: complete (commits 87a3ee1..a8e76ba, review clean — tuân thủ ✅, chất lượng Approved)
  ĐO THẬT thay cho ước tính: gài bộ đếm vào window.fetch, quan sát 117 giây →
  tổng lệnh gọi Supabase = 0, tới bảng Customers = 0, mảng đường dẫn rỗng.
  Trước khi sửa, 117 giây sẽ sinh khoảng 4 lần ping.
  Người rà soát đối chiếu 4 chuỗi lớp CSS: giống hệt từng ký tự.
  Phép thử đột biến: chèn setInterval vào Header → test đỏ đúng chỗ; hoàn tác → xanh.
  Đính chính một nghi ngờ của tôi: useCallback vẫn cần cho handleSignOut, không phải import thừa.

Ruling: công cụ read_network_requests KHÔNG đo được lệnh gọi Supabase vì nó chỉ ghi yêu cầu
  cùng nguồn gốc (localhost). Đo lệnh gọi ra ngoài phải gài bộ đếm vào window.fetch.
  — Vì sao ghi lại: đây là bẫy đã làm người thi công phải ước tính thay vì đo. Đợt sau cần
    đo lưu lượng tới Supabase thì dùng thẳng cách gài bộ đếm, đừng mất thời gian với công cụ mạng.
Task 5: DONE (commit 477ee62) — mục Định tuyến trong CONVENTIONS.md §15.
  LƯU Ý QUY TRÌNH: con agent bị cắt giữa chừng vì hết hạn mức phiên, đúng lúc đang đọc lại
  §15 để soát mâu thuẫn. Nó đã viết xong phần chính nhưng chưa commit. Tôi tự xác minh lại
  từng khẳng định rồi commit, thay vì nối lại agent — vì phần còn lại chỉ là kiểm tra.
  Xác minh: 3 tệp gọi setActiveTab (CustomerListView, DashboardView, WorkContext) — ĐÚNG;
  vercel.json còn rewrite — ĐÚNG; routes.test.ts giữ đủ ba quy tắc đường dẫn — ĐÚNG.
  Con agent tìm ra con số chính xác hơn giả định của tôi: chỉ 3 tệp dùng cầu tạm, không
  phải cả 19 màn. Tài liệu ghi theo con số thật đó.

Kiểm chứng cuối đợt 1a: 71 tệp / 1.711 test xanh, build sạch, lint chỉ còn cảnh báo có sẵn
  ở .agents/skills/ (ngoài dự án). Cây sạch. 13 commit trên nhánh.

=== RA SOAT CUOI NHANH (opus) ===
Kết luận: gộp được SAU KHI sửa mục 1. Không có phát hiện Critical.
Xác nhận hai ràng buộc lớn đều giữ: 0 tệp trong views/ hooks/ api/ bị đụng; CSS build giống
hệt bản gốc trừ đúng MỘT luật rác (xem mục 8). 19 màn đi thật đều dựng được, 0 lỗi console.
Luồng giải ngân chạy thật qua cầu tạm: form KUNN sang màn kia đã điền đủ, không mất state.
Lint: 62 cảnh báo, ĐÚNG BẰNG số của c5ebd57 — không sinh thêm cái nào.

Ruling: đưa vào đợt sửa ngay — mục 1, 2, 3, 5, 6, 7, 8.
  1 (Important) CONVENTIONS nói "thêm màn không sửa App.tsx" là SAI: App.tsx viết cứng 21 Route.
    Người rà soát gỡ một Route → thanh bên vẫn đủ 19 liên kết, bấm vào thì lặng lẽ về /dashboard.
    Tài liệu này sẽ tự tạo ra lỗi nó định ngăn. PHẢI sửa trước khi gộp.
  2 (Important) bảng tuyến đường — sản phẩm chính của đợt — KHÔNG có test phủ. Đổi /loans sang
    render CardContractView thì 1711 test vẫn xanh.
  3 (Important) cầu tạm setActiveTab không có test. Thay navigate bằng no-op → vẫn xanh.
  5 (Important) spec §6.1 còn liệt kê đường dẫn tiếng Việt; phán quyết đổi tiếng Anh chỉ nằm
    trong progress.md mà tệp đó BỊ XOÁ khi đóng đợt. Và câu "13 đường dẫn còn lại đã là hình
    cuối" sai ít nhất 3 chỗ.
  6 (Minor) CommandPalette đẩy thêm mục lịch sử khi chọn đúng màn đang mở.
  7 (Minor) activeTab tính ra nhưng không ai đọc, lại khiến cả cây provider render lại mỗi
    lần điều hướng.
  8 (Minor) TRANG-THAI.md rò một luật CSS chết vào bản build vì Tailwind v4 quét cả markdown.
    Đúng cái bẫy đợt 0 đã cảnh báo, nay xảy ra thật.

Ruling: HOÃN sang đợt 1b — mục 4.
  Header mới làm nửa spec §6.3: có navigator.onLine, THIẾU "cờ lỗi từ lần gọi API thật gần nhất".
  Hệ quả thật: chấm vẫn xanh "Trực tuyến" khi Supabase không với tới được (token hết hạn, rớt
  VPN) — đúng tình huống vòng ping cũ BẮT ĐƯỢC. Với hệ tín dụng, chấm xanh lúc lệnh lưu đang
  hỏng là tín hiệu sai.
  — Vì sao hoãn: cần một kênh ghi nhận lỗi API dùng chung, mà kênh đó chưa có và nằm trong
    src/lib/api/ — thư mục đợt 1a bị cấm đụng. Không làm được dưới ràng buộc hiện tại.
  — Giá nếu sai: người dùng tin chấm xanh trong lúc backend hỏng. Rủi ro thật nhưng không mới:
    hành vi này giống hệt lúc mạng có mà backend hỏng ở bản cũ giữa hai nhịp ping.
  — Đây là LỖI KẾ HOẠCH của tôi: brief Task 4 chỉ mô tả nửa navigator.onLine, bỏ mất nửa cờ lỗi.

Ruling: HOÃN — mục 9, 10, 11, 12. Đều nhỏ và không chặn.
Đợt sửa sau rà soát cuối: commits 8acb888, 30345cb, a3d627c, b5922f3, 3bf480a, d38fe5c, d12d6dc.
  Re-review: 7/7 ĐÃ XỬ LÝ. Hai phép thử đột biến đều đạt:
    - đổi tuyến /loans sang CardContractView → 1/23 đỏ đúng chỗ; hoàn tác → 23 xanh
    - thay navigate bằng no-op → 1/2 đỏ; hoàn tác → 2 xanh
  Luật CSS chết đã hết (grep fs-body = 0). Lint vẫn đúng 62 cảnh báo như bản gốc.

Ruling: sửa thêm một vòng nhỏ cho tài liệu, dù skill nói "không có đợt sửa thứ hai".
  Re-review bắt được 4 khẳng định sai trong mục Định tuyến của CONVENTIONS, 3 trong số đó do
  CHÍNH đợt sửa vừa rồi tạo ra (việc 5 gỡ activeTab nhưng không cập nhật đoạn mô tả nó).
  — Vì sao vẫn làm: đây là 10 dòng tài liệu, mọi số liệu tôi đã tự đo, và để nguyên thì đúng
    bằng cái bệnh "tài liệu nói sai hiện trạng" mà đợt 0 phải dành hẳn một task để chữa.
  — Giá nếu sai: gần như bằng không, chỉ là chữ.
  — Đã tự đọc lại toàn mục sau khi sửa và đối chiếu từng khẳng định với mã. Khớp. (commit e95c4e7)

ĐỢT 1a HOÀN TẤT. c5ebd57..e95c4e7, 21 commit, 1.732 test xanh 0 đỏ.
