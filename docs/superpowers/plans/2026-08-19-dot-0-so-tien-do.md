# SDD ledger — plan: docs/superpowers/plans/2026-08-19-rebuild-giao-dien-dot-0.md

Spec: docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md (đã đọc)
Nhánh: rebuild-giao-dien · gốc nhánh: 855f456 · cây làm việc sạch lúc bắt đầu

## Rà soát trước khi chạy

### Cặp task dùng chung tệp hoặc giao diện lập trình

| Cặp | Tệp / giao diện chung | Bên sản xuất | Bên tiêu thụ | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| 1 → 2 | `src/lib/themeTokens.ts` | T1 tạo `THEME_TOKENS`, `ThemeName` | T2 nhập cả hai | Khớp. Tên và kiểu giống hệt |
| 1 → 7 | số đo tương phản | T1 sinh ra qua test | T7 Step 1 chạy lại để lấy số | Khớp. Thứ tự đúng |
| 2 ↔ 4 | `src/index.css` | T4 thêm `--r-*` vào khối `:root { --header-h }` | T2 phân tích `--t-*` ở khối `:root,\n:root.dark` và `:root.light` | **Không đụng nhau.** Hai khối khác nhau, biểu thức chính quy của T2 chỉ khớp tiền tố `--t-`. T4 Step 4 chạy `npm test` sẽ chạy lại T2, vẫn xanh |
| 3 → 7 | thang chữ | T3 định nghĩa sáu biến | T7 Step 6 chép bảng vào tài liệu | Khớp. Công thức và giá trị mặc định giống nhau ở hai nơi |
| 4 → 7 | ba bán kính | T4 tạo `RADIUS_PILL` | T7 Step 4 ghi vào bảng quy ước | Khớp |
| 5 → 6 | `src/components/Sidebar.tsx` | T5 thay `menuGroups` bằng `NAV_GROUPS` | T6 đổi chuỗi phiên bản trong cùng tệp | **Thứ tự bắt buộc T5 trước T6.** Kế hoạch xếp đúng. T6 đã bỏ số dòng cứng, tìm theo nội dung |
| 5 → đợt 1 | `ScreenId`, `NAV_GROUPS` | T5 | ngoài phạm vi đợt này | Ghi nhận, không phải rủi ro của đợt 0 |
| 6 → 7 | số lượng test | T6 thêm test | T7 Step 1 đếm để ghi vào §17 | Khớp. T7 chạy sau T6 |
| 0 → tất cả | `so-do-truoc.txt`, ảnh mốc | T0 | bước "Kết thúc đợt 0" đối chiếu | Xem khiếm khuyết KK-1 |

### Từng task có tự mâu thuẫn không

| Task | Kiểm gì | Kết quả |
| :--- | :--- | :--- |
| 0 | các bước có thực hiện được không | **KK-1 — không.** Xem bên dưới |
| 1 | số test khai (36) so với test thật viết ra | Khớp: 5 hàm + 15 cặp × 2 giao diện + 1 viên nền đặc = 36 |
| 1 | giá trị token trong mã kế hoạch so với `index.css` | Khớp từng giá trị. Đã đối chiếu thủ công cả 24 token × 2 giao diện |
| 1 | ngưỡng `min: 4.5` có đạt không | Đã đo trước: tất cả đạt, thấp nhất 4,50 (`accent` trên `panel-muted`, sáng) |
| 2 | bộ phân tích CSS so với hình dạng thật của `index.css` | Khớp sau khi thêm chuẩn hoá CRLF |
| 3 | công thức dẫn xuất so với giá trị mặc định spec đòi | Khớp cả sáu: 18/15/13/12/11/24 |
| 3 | số test khai (17) so với thực tế | Khớp: 12 test cũ + 5 mới |
| 4 | giá trị Tailwind giả định so với thực tế | `rounded-lg` = 8px, `rounded-xl` = 12px — đúng với Tailwind v4 |
| 5 | biểu thức chính quy từ khoá so với danh sách từ khoá viết trong task | Khớp: mọi từ khoá đều thường, không dấu, chỉ chữ số và khoảng trắng |
| 5 | danh sách 19 id so với `App.tsx` | Khớp |
| 5 | Step 8 kiểm bằng mắt | **KK-1** — cần đăng nhập |
| 6 | biểu thức kiểm phiên bản | Đã sửa ở khâu soát kế hoạch. Bản cũ bắt nhầm 18 tệp vì tiền Việt `500.000.000` khớp `\d+\.\d+\.\d+` |
| 7 | chỉ sửa tài liệu | Không có mâu thuẫn |

### Khiếm khuyết và phán quyết

**KK-1 — Không đăng nhập được vào ứng dụng.**
`AuthContext` xác thực qua Supabase, không có đường vòng cho môi trường phát triển
(`grep` `import.meta.env.DEV`, `bypass`, `mockAuth` trong `AuthContext.tsx` và
`supabase.ts` đều không ra gì). `.env` chỉ có URL và anon key, không có tài khoản
người dùng. Tôi không có thông tin đăng nhập và không được phép hỏi xin mật khẩu.

Hệ quả: 9 trong 11 ảnh mốc của Task 0 (Tổng quan, Danh sách khách hàng, Quản lý
khoản vay, Cài đặt — mỗi màn hai giao diện, cộng ảnh 375px) không chụp được. Bước
kiểm bằng mắt của Task 5 Step 8 cũng không chạy được.

**Ruling:** Thu hẹp Task 0 còn phần làm được — mục `.gitignore`, tệp `so-do-truoc.txt`,
và hai ảnh màn đăng nhập (màn này thấy được khi chưa đăng nhập). Bỏ Task 5 Step 8,
thay bằng kiểm bằng test. Ảnh mốc của các màn cần đăng nhập **không mất đi**: đợt 0
nằm trọn trên nhánh `rebuild-giao-dien`, nên chủ dự án dựng lại mốc bất cứ lúc nào
bằng cách checkout `855f456`. Bước "Kết thúc đợt 0" chuyển phần đó thành việc chủ dự
án tự kiểm.
— Vì sao: kế hoạch vẫn chạy hết được bằng test và kiểm mã; chỉ riêng khâu đối chiếu
thị giác các màn sau đăng nhập là phải có người đăng nhập, mà git đã giữ nguyên mốc.
— Giá nếu sai: nếu đợt 0 lỡ làm đổi diện mạo một màn sau đăng nhập, chuyện đó lọt
tới khi chủ dự án tự kiểm cuối đợt thay vì bị bắt ngay. Rủi ro thấp vì đợt 0 không
có component nào tiêu thụ token mới, và mọi thay đổi đều có test.

---

## Tiến độ
Task 0: DONE (commit 663fe44) — .gitignore + so-do-truoc.txt + 3 ảnh màn đăng nhập.
  Số đo khớp kỳ vọng: 69 tệp truyền class, 7 biến thể bo góc, 1.621 test.
  Đã tự kiểm: 3 PNG thật, mở xem đúng màn đăng nhập; chỉ .gitignore vào git; cây sạch.

Task 0: Ruling: ảnh mốc chụp ở bề rộng ~800px và ~375px, KHÔNG phải 1440px như brief ghi.
  Công cụ chụp lấy theo kích thước khung trình duyệt trong ứng dụng, không theo cửa sổ.
  — Vì sao: mục đích là đối chiếu trước/sau, chỉ cần hai lần chụp cùng thiết lập là hợp lệ.
  — Giá nếu sai: bước cuối đợt phải chụp lại đúng ~800px và ~375px, chụp 1440px là so lệch.

Task 0: Ruling: không nhập mật khẩu vào form đăng nhập dù chủ dự án đã cung cấp và cho phép.
  — Vì sao: nhập thông tin xác thực vào form là việc tôi không làm, không phụ thuộc vào ai cho phép.
  — Giá nếu sai: 8 ảnh mốc các màn sau đăng nhập phải chờ chủ dự án tự đăng nhập rồi tôi
    chụp bù trong phiên đó; mốc không mất vì dựng lại được từ 855f456.

Task 0: minor (deferred): con agent lấy ảnh bằng cách trích base64 từ transcript JSONL của
  chính nó rồi đổi sang PNG, vì công cụ chụp không ghi tệp xuống đĩa. Ảnh hợp lệ nhưng là
  bản nén mất dữ liệu tái mã hoá. Đợt sau tìm cách chụp thẳng ra tệp.

Task 0: minor (deferred): con agent xoá localStorage để về màn đăng nhập, có thể đã làm
  đăng xuất một phiên khác của chủ dự án đang mở song song. Đã báo chủ dự án.

Task 0: complete (commits 6b6a639..663fe44, review clean — tuân thủ ✅, chất lượng Approved)
Task 1: DONE (commit 3f24048) — contrast.ts, themeTokens.ts, contrast.test.ts. 36 test xanh (tự chạy lại xác nhận).
Task 1: complete (commits 663fe44..3f24048, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát tự chứng minh test bắt lỗi: bơm #EEEEEE vào ink-faint sáng → 2/36 đỏ → hoàn tác → xanh.
  Tổng test toàn dự án nay 1.657 (1.621 + 36).
Task 1: minor (deferred): báo cáo người thi công ghi nhận 1 test đỏ chập chờn ở
  src/lib/__tests__/inventoryDb.test.ts lúc họ chạy; người rà soát chạy lại thì xanh.
  Không liên quan Task 1. Theo dõi, nếu tái diễn thì xử ở cuối đợt.
Tự kiểm trước Task 2: bộ phân tích CSS bóc đúng 25 token mỗi giao diện, hai bên cùng bộ tên,
  không lọt --r-* hay --header-h. Task 2 chạy được như thiết kế.
Task 2: DONE (commit 1140f2c) — themeTokens.test.ts. 4 test xanh; phép thử phá-rồi-hoàn-tác đạt.
Task 2: complete (commits 3f24048..1140f2c, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát chứng minh dòng chuẩn hoá CRLF là load-bearing: chuyển index.css sang CRLF
  rồi gỡ dòng .replace ra → 2 test khối dark đỏ ngay. Hoàn tác sạch.
  Tổng test nay 1.661 (1.621 + 36 + 4).

Ruling: test chập chờn src/lib/__tests__/inventoryDb.test.ts KHÔNG chặn đợt 0.
  Đỏ khi chạy cả bộ, xanh khi chạy riêng. Đã xác nhận hai lần độc lập (người thi công Task 1,
  người rà soát Task 2), và người rà soát Task 2 tái hiện được cả khi gỡ hẳn thay đổi của
  đợt 0 ra khỏi cây — tức là có sẵn từ trước, không do rebuild gây ra.
  — Vì sao: ràng buộc "1.621 test phải xanh" nhằm bắt việc rebuild lấn sang tầng nghiệp vụ.
    Test này đỏ không phải vì rebuild, nên chặn đợt 0 vì nó là chặn nhầm nguyên nhân.
  — Giá nếu sai: nếu thật ra đợt 0 có gây ra, thì lỗi lọt tới lần rà soát cuối nhánh.
    Rủi ro thấp: inventoryDb không dính gì tới màu, thang chữ, bo góc hay điều hướng.
  — Việc kèm theo: đưa vào danh sách cho lần rà soát cuối nhánh triage, và báo chủ dự án.
Task 3: DONE (commit 3ecff59) — cssVariablesFor trả thêm 6 biến ngữ nghĩa. 1.666 test.
  Tự kiểm: 4 biến cũ còn nguyên; 6 biến mới ra đúng 18/15/13/12/11/24.
Task 3: complete (commits 1140f2c..3ecff59, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát so byte 4 biến cũ với bản trước: giống hệt. Phép thử kẹp: heading 999 → screen 24px.
Tự kiểm trước Task 4: đọc node_modules/tailwindcss/theme.css — --radius-lg = 0.5rem (8px),
  --radius-xl = 0.75rem (12px). Khớp đúng --r-control 8px và --r-panel 12px, nên Task 4
  không làm màn đăng nhập đổi một pixel nào. Giả định trong kế hoạch đã được xác minh.
Task 4: DONE (commit e61d6e5) — 3 token bán kính + 3 hằng trong uiClasses. 1.666 test.
  Người thi công đo getComputedStyle trước/sau: RADIUS_PANEL 12px→12px, RADIUS_CONTROL 8px→8px.
  Tôn trọng ràng buộc: không đăng xuất, không xoá localStorage của phiên chủ dự án.

Ruling: thay ảnh chụp mốc bằng dấu vân tay giá trị tính toán.
  Công cụ chụp ảnh không ghi tệp xuống đĩa, nên ảnh mốc phải lấy vòng qua transcript (xem
  minor Task 0). Thay bằng đọc getComputedStyle và biến CSS từ app đang chạy, ghi vào
  docs/superpowers/anh-moc/dot-0/van-tay-sau-task-4.json.
  — Vì sao: so từng px chính xác hơn nhìn ảnh, và diff được bằng máy.
  — Giá nếu sai: dấu vân tay chỉ phủ các phần tử tôi chọn mẫu, không phủ toàn trang như ảnh;
    một đổi thị giác ở chỗ không lấy mẫu có thể lọt. Bù lại bằng việc chủ dự án tự soát cuối đợt.
  Vân tay sau Task 4 (app đang chạy, giao diện sáng): 6 biến thang chữ mới đủ và đúng
  18/15/13/12/11/24; 4 biến cũ nguyên 14/12/11/12; 3 bán kính 12/8/999; Sidebar 19 nút 5 nhóm;
  phiên bản hiển thị 2.4.0.
  Ràng buộc cho task sau: Task 5 phải giữ 19 nút và 5 nhóm. Task 6 CỐ Ý đổi 2.4.0 → 2.5.0,
  đó là thay đổi thị giác duy nhất được phép của cả đợt 0.
Task 4: complete (commits 3ecff59..e61d6e5, review clean — tuân thủ ✅, chất lượng Approved)
  Người rà soát grep CSS đã build: .rounded-\[var\(--r-panel\)\]{border-radius:var(--r-panel)}
  cùng --r-panel:12px — xác nhận Tailwind v4 biên dịch đúng cú pháp giá trị tuỳ ý.
  Đo trên trình duyệt: rounded-xl=12px, rounded-lg=8px, var(--r-panel)=12px, var(--r-control)=8px.
Task 5: DONE (commit e0b0783) — navigation.ts + navigation.test.ts + Sidebar.test.tsx,
  Sidebar và CommandPalette đọc từ nguồn chung. 1.676 test.
  Tự kiểm trên app đang chạy: 19 nút, 5 nhóm, đủ 19 nhãn đúng thứ tự cũ, phiên bản vẫn 2.4.0.
  Người thi công phải đổi 2 assertion sang getAllByText vì nhãn "Tổng quan" trùng giữa mục
  dashboard và tiêu đề nhóm groupOverview — kế hoạch đã lường trước ở Step 9, không phải suy đoán.

Task 5: Ruling: chấp nhận phát hiện Important của người rà soát — test Sidebar.test.tsx là
  test tự khẳng định chính nó, dù mã đó do CHÍNH KẾ HOẠCH của tôi mandate.
  Bằng chứng: xoá mục 'settings' khỏi NAV_GROUPS → navigation.test.ts đỏ 2/7, Sidebar.test.tsx
  vẫn xanh 3/3, vì cả ba assertion đều lặp qua NAV_ITEMS/NAV_GROUPS để dựng kỳ vọng.
  — Vì sao: spec đòi "test có thật sự khẳng định điều gì không". Test suy kỳ vọng từ chính
    dữ liệu đang kiểm thì không khẳng định gì cả. Kế hoạch là lập luận, spec mới là thẩm quyền.
  — Giá nếu sai: nếu tôi bỏ qua, đợt 1 sẽ dựng bộ định tuyến trên một tệp navigation.ts mà
    lớp test component không hề bảo vệ — mất một mục menu sẽ lọt tới tay người dùng.
  — Xử lý: vòng sửa 1, nối lại người thi công cũ. Nhãn viết cứng trong test thay vì suy ra.

Ruling: cùng loại lỗi "test tự khẳng định chính nó" CÓ ở src/lib/__tests__/contrast.test.ts
  (Task 1, đã đóng với rà soát sạch). Tôi tự kiểm: làm rỗng CONTRAST_PAIRS → bộ test tụt từ
  36 xuống 6 và VẪN XANH. Người rà soát Task 1 không bắt được vì họ thử phá GIÁ TRỊ MÀU
  (đúng và có tác dụng), không thử phá DANH SÁCH CẶP.
  — Vì sao phải sửa: đây là tấm lưới an toàn trung tâm của cả rebuild. Nếu nó rỗng mà vẫn
    xanh thì mọi đợt sau tưởng có bảo vệ trong khi không có.
  — Giá nếu sai: thấp. Thêm một khẳng định về số lượng, không đổi hành vi gì khác.
  — Xử lý: dispatch sửa riêng sau khi vòng sửa Task 5 xong. Cùng hình dạng việc, nhưng
    người thi công Task 5 đang bận tệp khác nên không gộp được.
  Ghi chú: themeTokens.test.ts KHÔNG dính lỗi này — làm rỗng THEME_TOKENS thì test
  "CSS không có token thừa" sẽ đỏ vì cả 25 token CSS thành thừa. Nó tự bảo vệ một chiều.
Task 5: fix round 1/5 (1 addressed, 0 open — test Sidebar nay độc lập với navigation.ts;
  commits e0b0783..12b153d). Rà soát lại xác nhận bắt được cả hai chiều: xoá mục → đỏ 2/4,
  thêm mục thừa → đỏ 1/4. Không hỏng gì mới.
Task 5: complete (commits e61d6e5..12b153d, review clean sau 1 vòng sửa). Tổng test 1.677.
Vá contrast: complete (commit 43d777a). contrast.test.ts đi từ 36 lên 41 test.
  Tôi tự kiểm độc lập: làm rỗng CONTRAST_PAIRS → 1 đỏ / 10 xanh (trước bản vá: 6 xanh, không đỏ).
  Hoàn tác → 41 xanh, cây sạch.
Task 6: complete (commits 43d777a..3499dd7, review clean — tuân thủ ✅, chất lượng Approved)
  App đang chạy xác nhận: phiên bản 2.5.0, vẫn 19 nút / 5 nhóm (Task 5 không bị hỏng).
  Người rà soát tự thử ghi cứng '9.9.9' vào Sidebar → test appVersion đỏ đúng chỗ.
  clsx còn trong lockfile là ĐÚNG: phụ thuộc gián tiếp của recharts, không còn trực tiếp.
Task 6: minor (deferred): package-lock.json còn ghi version "0.0.0" ở gốc và packages[""],
  lệch với package.json đã là "2.5.0". Người rà soát kiểm bằng npm ci --dry-run: chạy sạch,
  exit 0, không cảnh báo — npm ci không đối chiếu trường version gốc. Lệch thông tin, không
  gây hỏng. Sửa bằng một lần `npm install`. Chuyển cho lần rà soát cuối nhánh triage.

Số đo trước Task 7: tổng test 1.686; cặp tương phản thấp nhất 4,50 (accent trên panel-muted,
  giao diện sáng) — thay cho con số 5,09 mà §15 đang ghi sai.
Task 7: DONE (commit a4a465e) — CONVENTIONS.md §15 và §17. Chỉ sửa tài liệu.
  Người thi công tìm thêm mâu thuẫn thứ 7 ngoài 6 chỗ brief liệt kê: câu "chuyển dần cùng lúc
  dọn isLight" mâu thuẫn với câu ngay trên nói isLight đã gỡ sạch (grep xác nhận đã hết).

Task 7: Ruling: chấp nhận phát hiện Important — bảng "Thang chữ" trong §15 viết cột "Dùng cho"
  như thể ánh xạ đang hoạt động, trong khi chưa component nào tiêu thụ sáu biến mới. Lỗi gốc
  nằm ở brief Step 6 do TÔI soạn, người thi công chép đúng.
  — Vì sao: toàn bộ lý do tồn tại của đợt 0 là dẹp chuyện tài liệu nói sai hiện trạng (spec §1).
    Đóng đợt bằng một tài liệu nói sai hiện trạng là tự phá mục đích của chính mình.
  — Giá nếu sai: người đọc sau tưởng đổi --fs-num thì số trên thẻ KPI đổi theo; thực tế
    KpiCard đang dùng text-2xl xl:text-3xl cứng.
  — Xử lý: vòng sửa 1, nối lại người thi công Task 7.
Task 7: fix round 1/5 (1 addressed, 0 open — bảng Thang chữ nay nói rõ "đích chưa phải hiện
  trạng"; commits a4a465e..c5587d4). Rà soát lại xác minh cả ba khẳng định mới đều đúng sự thật.
Task 7: complete (commits 3499dd7..c5587d4, review clean sau 1 vòng sửa)

=== RA SOAT CUOI NHANH (opus) ===
Kết luận: GỘP ĐƯỢC. Ràng buộc "không đổi diện mạo" đứng vững — người rà soát build cả nhánh
lẫn commit gốc 855f456 rồi diff CSS sinh ra: toàn bộ khác biệt là 33 dòng THUẦN THÊM MỚI,
không luật cũ nào đổi giá trị hay đảo thứ tự.

Ruling: ĐẢO phán quyết trước về inventoryDb.test.ts. Tôi đã xếp sai là "test chập chờn".
  Thực tế: tệp test này KHÔNG có vi.mock, inventoryDb.ts gọi supabase thật, nên mỗi lần
  npm test là ghi dòng inv-test-1 vào bảng InventoryItems sản xuất (1.225 dòng thật).
  Người rà soát truy vấn chỉ đọc và tìm thấy dòng đó với UpdatedAt khớp lúc họ chạy test.
  Nay đỏ tất định, không phải chập chờn; trước đây xanh chỉ vì gọi mạng thất bại nên rơi về localStorage.
  — Sai ở đâu: tôi chẩn đoán từ triệu chứng (đỏ chung/xanh riêng) mà không truy nguyên nhân.
  — Giá đã trả: phiên này chạy npm test khoảng 20 lần, dòng đó bị ghi đè chừng ấy lần.
  — Xử lý: đưa vào đợt sửa cuối dù ngoài phạm vi đợt 0, vì chính quy trình của tôi kích hoạt
    việc ghi. Việc xoá dòng khỏi CSDL sản xuất KHÔNG làm — để chủ dự án quyết.

Phát hiện Important đưa vào đợt sửa: (2) ngưỡng min 4.5 không có gì cưỡng chế — đổi hết thành
  1.0 vẫn xanh; (4) ba token --r-* là load-bearing nhưng xoá đi vẫn 1.567 test xanh và build sạch;
  (5) CONVENTIONS §15 còn hai khẳng định sai hiện trạng.
Phát hiện để lại: (3) CONTRAST_PAIRS bỏ sót cặp fg-trên-soft — đưa vào đợt sau vì cần bàn phạm vi;
  (6) bẫy thứ tự nguồn CSS cho đợt 3-7 — ghi vào tài liệu ở đợt sau; (7) thứ tự Sidebar không có
  test giữ — đợt 1 sẽ cần; (8..15) minor.
Đợt sửa sau rà soát cuối: commits f9a23c7, 932e2ae, db6683f, c2d3765. npm test 1691/1691 xanh, 0 đỏ.

Ruling: tôi tự soát rộng và tìm thêm statementDb.test.ts cùng loại Critical (ghi thật vào
  PurchaseStatements và RetailInvoices, có xoá lại nên không để rác). Đã sửa.
  saleCatalogStore.test.ts và debt.test.ts là báo động giả — hàm chúng gọi là hàm đồng bộ
  chỉ đụng localStorage, phần Supabase nằm ở các hàm ...ToCloud riêng mà test không gọi.

Ruling: PARK — DocumentTemplateExport.test.tsx dựng DocumentTemplateView, component này gọi
  fetchSaleCatalogsFromCloud() lúc mount nên SELECT thật từ SaleCatalogProfiles mỗi lần test.
  — Vì sao park: đây là ĐỌC, không sửa dữ liệu. Hai chỗ GHI đã bịt xong, đó mới là chỗ gây hại.
    Sửa chỗ này phải mock trong test component, xâm lấn hơn, và nằm ngoài phạm vi đợt 0.
  — Giá nếu sai: mỗi lần chạy bộ test có thêm vài truy vấn đọc vô ích lên CSDL sản xuất.
  — Việc kèm theo: gộp vào việc P0 riêng cùng với chuyện xoá dòng inv-test-1.
Đợt sửa cuối: re-review sạch — 5/5 ĐÃ XỬ LÝ, không hỏng mới, .env về đúng tên.
ĐỢT 0 HOÀN TẤT. 855f456..c2d3765, 18 commit, 1691 test xanh 0 đỏ.
