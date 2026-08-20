# Rebuild giao diện — trạng thái hiện tại

> Tệp này để **bắt lại mạch khi mở phiên trò chuyện mới**. Cập nhật sau mỗi task xong.
> Sổ chi tiết của phiên đang chạy nằm ở `.superpowers/sdd/<tên-kế-hoạch>/progress.md`, nhưng thư mục đó bị `.gitignore` bỏ qua và bị xoá khi đóng đợt — nên mọi thứ cần sống lâu phải nằm ở đây.

**Cập nhật lần cuối:** 2026-08-21, sau khi đợt 1b đã gộp và đẩy lên `main`.

---

## Bắt đầu phiên mới thì làm gì

1. Đọc hết tệp này.
2. Đọc bản thiết kế `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md`.
3. Hỏi chủ dự án muốn vào **đợt 1b** hay xử **việc còn treo** trước (xem hai mục dưới).
4. Lập kế hoạch bằng skill `superpowers:writing-plans`, thi công bằng skill `superpowers:subagent-driven-development` — giao subagent từng task, rà soát giữa các task.
5. Cập nhật tệp này sau mỗi task xong.

**Đừng hỏi lại chủ dự án những câu đã có đáp án** trong mục "Quyết định đã chốt" và "Phán quyết còn hiệu lực" bên dưới.

---

## Đang ở đâu

| | |
| :--- | :--- |
| Nhánh hiện tại | `main` — sạch, khớp `origin/main` |
| Việc đang dở | không có. Hai đợt đã đóng gọn |
| Đợt vừa xong | **1b — ngữ cảnh khách hàng**, 20 commit, đã gộp và đẩy (`f02c153..a5c91a7`) |
| Đợt kế tiếp | **2 — bộ component + `Dialog`/`ConfirmDialog`**, chưa lập kế hoạch |
| Tổng test | **1.825** xanh, 0 đỏ · 86 tệp test (một phần tăng là việc song song của chủ dự án, không phải toàn bộ thuộc đợt 1b) |
| Cảnh báo lint | 64 (baseline đợt 1a là 62; 1 cảnh báo mới thuộc đợt 1b — `src/hooks/useLoanPortfolioController.ts:145`, `missing dependency: 'portfolio'`, từ hiệu ứng deep-link Task 15) |
| Tự kiểm trên giao diện thật | **chưa làm** — xem "Việc còn treo" |

## Đợt 1b đã tạo ra gì

Gộp vào `main`, 20 commit `f02c153..a5c91a7`.

| Tệp | Ở đâu | Dùng để làm gì |
| :--- | :--- | :--- |
| `customerRoutes.ts` | `src/lib/` | Nơi duy nhất dựng/đọc đường dẫn có `:customerId` — `customerPath`, `customerProfilePath`, `kunnSchedulePath`, `parseCustomerPath`, `CUSTOMER_SCOPED_SCREENS` |
| `useSelectedCustomerId.ts` | `src/hooks/` | Đọc khách đang chọn từ URL (`useParams` trước, rơi xuống `parseCustomerPath(pathname)` cho component ở tuyến cha); `useCustomerNavigate()` điều hướng khi đổi khách |
| `customerContext.ts` | `src/lib/` | Dựng `CustomerContextSummary` (tên, CIF, điện thoại, dư nợ, hạn mức khả dụng, nhóm nợ) từ dữ liệu đã nạp |
| `useCustomerContext.ts` | `src/hooks/` | Nạp riêng dữ liệu cho thanh ngữ cảnh, tách khỏi đường nạp lịch trả nợ của controller |
| `CustomerContextBar.tsx` | `src/components/` | Thanh ngữ cảnh: tên · CIF · điện thoại · dư nợ · hạn mức khả dụng · nhóm nợ (kèm số ngày quá hạn nếu >0) · nút đổi khách |
| `apiHealth.ts` | `src/lib/` | Cờ lỗi từ lần gọi API thật gần nhất — nửa sau spec §6.3 mà Header còn thiếu ở đợt 1a |
| `useApiHealth.ts` | `src/hooks/` | Hook đọc cờ trên cho Header |

`WorkContext` đã xoá hẳn — không còn `setActiveTab`, không còn `selectedCustomerId` trong context.
Bốn controller (`useCardContractController`, `useCreditContractController`,
`useLoanPortfolioController`, `usePostLoanControlController`) đọc khách từ URL qua
`useSelectedCustomerId`. `disburseRequest` chuyển thành `?disburse=` trên URL.

Năm màn hồ sơ tín dụng nay có cả bản phẳng lẫn bản lồng `/customers/:customerId/…`, cùng render
một component (chi tiết ở `CONVENTIONS.md` §15 "Định tuyến"). Hai đường sâu mới:
`/customers/:customerId/profile` và `/customers/:customerId/loans/:kunnId/schedule`.

**Đã đo xong 20/08/2026, đừng đo lại.** `EXPLAIN (ANALYZE)` trên CSDL thật, đặt `role authenticated` + `request.jwt.claims` để RLS thực sự chạy, khách nặng nhất là `CustomerId` 55 (6 KUNN, 1.420 dòng lịch; toàn bảng 10.350 dòng / 112 KUNN / 51 khách):

| Truy vấn | Thời gian | Dòng |
| :--- | ---: | ---: |
| `RepaymentSchedules` theo **một** `ContractId`, `select *` — cách bốn controller đang dùng | 66,2 → 30,7 ms | 240 |
| ×6 KUNN của một khách, tuần tự | ~180–400 ms + 6 lượt mạng | 1.420 |
| `RepaymentSchedules` gộp `in(6 ContractId)` | 174,5 ms | 1.420 |
| **`ContractPaidPrincipal` lọc `in(6 ContractId)`** | **11,1 / 11,8 ms** | **6** |
| Lịch quá hạn, cột hẹp, `DueDate <` hôm nay | 1,9 ms | 0 |
| `CreditContracts` / `LoanContracts` theo khách | 3,3 / 2,5 ms | 1 / 6 |

**Nguyên nhân chênh 20 lần:** RLS gắn `can_access_contract("ContractId")` thành bộ lọc **từng dòng** trên `RepaymentSchedules` — đọc 1.420 dòng là gọi hàm 1.420 lần. View `ContractPaidPrincipal` gộp trong CTE `MATERIALIZED` trước rồi mới lọc, nên chỉ gọi 130 lần.

**Phán quyết:** thanh ngữ cảnh **nạp riêng**, bốn truy vấn chia hai lượt song song ≈ 21 ms DB. Không dùng chung đường nạp lịch trả nợ của controller.

**Ngã rẽ chủ dự án chốt 20/08/2026:** giữ **cả hai** họ đường dẫn. Đường phẳng = chưa chọn khách (`/post-loan-control` vẫn hiện toàn danh mục), đường lồng `/customers/:customerId/…` = đã chọn khách. Hai họ render cùng một component.

**URL đã chạy thật.** Bấm mục thanh bên → đường dẫn đổi; F5 → giữ nguyên chỗ; Back → quay về màn trước; đường dẫn lạ → về `/dashboard`. Đã tự kiểm cả 19 màn trên giao diện thật, không màn nào trắng, không lỗi console.

**Đường dẫn viết tiếng Anh** — chủ dự án chốt 20/08/2026 để tránh rắc rối mã hoá và công cụ:

| Nhóm | Đường dẫn |
| :--- | :--- |
| Tổng quan | `/dashboard` |
| Hồ sơ tín dụng | `/customers` · `/credit-contracts` · `/loans` · `/collaterals` · `/credit-cards` |
| Công cụ | `/tools/calculators` · `/tools/business-plan` · `/tools/inventory` · `/tools/purchase-statement` · `/tools/retail-invoice` · `/tools/rate-quote` · `/tools/cost-of-funds` |
| Tra cứu | `/reference/loan-purpose` · `/reference/card-policies` · `/reference/templates` · `/reference/quiz` |
| Kiểm soát | `/post-loan-control` · `/settings` |

Đợt 1b (xong, 20/08–21/08/2026) đã lồng năm màn hồ sơ tín dụng vào `/customers/:id/…` và xoá
hẳn `WorkContext` — không còn cầu tạm nào. Chi tiết đường dẫn, cách thêm màn, hai đường sâu
`/profile` và `/loans/:kunnId/schedule` nằm ở `CONVENTIONS.md` §15 "Định tuyến".

**Thêm màn phải sửa BA chỗ** (bốn nếu màn có phạm vi khách): `routes.ts` · `navigation.ts` ·
`App.tsx` · (`customerRoutes.ts` nếu có phạm vi khách). Quên một chỗ thì mục menu vẫn hiện nhưng
bấm vào lặng lẽ về `/dashboard` hoặc không đổi theo khách. `routing.test.tsx` bắt được lỗi tuyến
đường; xem `CONVENTIONS.md` để biết đủ bốn chỗ.

**Ba lỗi tôi từng viết sai trong kế hoạch đợt 1a, đã sửa — ghi lại để đợt sau tránh:**
1. `BrowserRouter` phải bọc **ra ngoài** `ProviderComposer`. `ProviderComposer` dựng cây bằng `reduceRight` nên `WorkProvider` là lớp trong cùng; đặt ngược thì `useLocation()` ném lỗi lúc khởi động.
2. Test dựng `AppLayout` phải giả lập `AuthContext`, kẻo nó render màn đăng nhập chứ không phải thanh bên.
3. Test dựng `AppLayout` còn cần `WorkProvider` và `ThemeProvider` bao ngoài.

---

## Hồ sơ đã có, đọc khi cần

| Tệp | Nội dung |
| :--- | :--- |
| `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md` | Bản thiết kế — **thẩm quyền cao nhất** |
| `docs/superpowers/plans/2026-08-19-rebuild-giao-dien-dot-0.md` | Kế hoạch đợt 0 |
| `docs/superpowers/plans/2026-08-19-dot-0-so-tien-do.md` | Sổ tiến độ đợt 0 — 11 phán quyết |
| `docs/superpowers/plans/2026-08-20-rebuild-giao-dien-dot-1a-dinh-tuyen.md` | Kế hoạch đợt 1a |
| `docs/superpowers/plans/2026-08-20-dot-1a-so-tien-do.md` | Sổ tiến độ đợt 1a — 7 phán quyết |
| `docs/superpowers/plans/2026-08-20-rebuild-giao-dien-dot-1b-ngu-canh-khach-hang.md` | **Kế hoạch đợt 1b — 17 task, chưa thi công** |
| `CONVENTIONS.md` §15 | Quy ước giao diện: token, thang chữ, bo góc, màu, định tuyến |

---

## Bản thiết kế và các quyết định đã chốt

Bản thiết kế: `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md`

Chủ dự án đã chốt trong phiên brainstorm ngày 19/08/2026:

| Quyết định | Lựa chọn |
| :--- | :--- |
| Lý do rebuild | Nhìn cũ thiếu nhất quán · dùng chậm thao tác nhiều. **Không** phải vì luồng làm việc sai |
| Hướng diện mạo | **Bảng điều khiển** — vỏ thẻ, bo góc, đổ bóng nhẹ, số lớn, thoáng |
| Chính sách màu | **Rộng rãi** — 5 sắc KPI, số tiền `pos`, ngày tháng `accent`, viên trạng thái nền đặc. Tiêu đề panel **không** tô |
| Khung điều hướng | **Thanh ngữ cảnh khách hàng** + URL thật |
| Định danh trên URL | **`Id` số**, không dùng CIF |
| Nền component | **Radix UI primitives** — chỉ 3 gói: `dialog`, `popover`, `tabs` |
| Cách triển khai | **Theo đợt**, mỗi đợt merge được, app luôn chạy |
| Ba màn tồn kho | **Gộp** — sidebar còn 17 mục (làm ở đợt 5) |

---

## Tám đợt

| Đợt | Nội dung | Trạng thái |
| :--- | :--- | :--- |
| **0** | Token, thang chữ, bo góc, `navigation.ts`, dọn rác, viết lại §15 §17 | ✅ **xong, đã gộp vào `main`** (`c5ebd57`) |
| **1a** | `react-router`, khung `AppLayout`, Sidebar, CommandPalette, Header thôi ping CSDL | ✅ **xong, đã gộp vào `main`** (`b0b6653`) |
| **1b** | `useSelectedCustomerId` đọc `:id`, thanh ngữ cảnh khách hàng, chuyển 4 controller, luồng giải ngân qua URL | ✅ **xong, đã gộp vào `main`** (`f02c153..a5c91a7`) |
| **2** | Bộ component + `Dialog`/`ConfirmDialog` — thay 15 modal và 13 tệp `window.confirm` | ⬅️ **kế tiếp**, chưa lập kế hoạch |
| **3** | Hồ sơ tín dụng: Khách hàng, HĐTD, Khoản vay, TSĐB, Thẻ. **Nặng nhất** — gỡ 65 props của `KunnForm` | chưa |
| **4** | Tổng quan, Kiểm soát sau vay | chưa |
| **5** | Công cụ & Phương án — 5 màn sau khi gộp tồn kho | chưa |
| **6** | Tra cứu & Biểu mẫu — 4 màn, gỡ 65 `useState` của `DocumentTemplateView` | chưa |
| **7** | Cài đặt, dọn nốt cầu tạm | chưa |

---

## Đợt 0 đã tạo ra gì

Gộp vào `main` ngày 19/08/2026, 18 commit, `855f456..c5ebd57`.

| Thứ | Ở đâu | Dùng để làm gì |
| :--- | :--- | :--- |
| `contrast.ts` | `src/lib/` | Tính tỷ lệ tương phản WCAG |
| `themeTokens.ts` | `src/lib/` | Bảng màu dạng TypeScript + `CONTRAST_PAIRS` |
| `navigation.ts` | `src/lib/` | Khai báo duy nhất 19 màn |
| `appVersion.ts` | `src/lib/` | Một nguồn cho số phiên bản |
| 6 biến thang chữ | `fontSettings.ts` | `--fs-screen/title/body/dense/label/num`. **Chưa màn nào tiêu thụ** |
| 3 bán kính | `index.css` + `uiClasses.ts` | `--r-panel` 12px, `--r-control` 8px, `--r-pill` 999px |

**Lưới an toàn đã dựng, đừng gỡ:**
- `contrast.test.ts` — mọi cặp màu ngữ nghĩa đạt WCAG AA 4.5, và `min` không hạ được xuống dưới 4.5
- `themeTokens.test.ts` — `index.css` không trôi khỏi `themeTokens.ts`; ba token bán kính không xoá được
- `navigation.test.ts` + `Sidebar.test.tsx` — 19 mục, 5 nhóm, bắt được cả thiếu lẫn thừa

**Cặp tương phản sát nhất: 4,50** (`accent` trên `panel-muted`, giao diện sáng). Đổi giá trị `--t-*` là phải đo lại.

---

## Phán quyết còn hiệu lực

Những điều dưới đây đã quyết rồi, đừng quyết lại:

**Không nhập mật khẩu vào form đăng nhập** dù chủ dự án đã cấp và cho phép. Nếu cần xem màn sau đăng nhập thì nhờ chủ dự án tự đăng nhập một lần, rồi dùng phiên đó.

**Không xoá `localStorage` của trình duyệt.** Máy chủ phát triển có thể đang giữ phiên đăng nhập thật của chủ dự án; xoá là làm văng phiên làm việc của họ. Đã lỡ một lần ở đợt 0.

**Mốc đối chiếu dùng dấu vân tay giá trị tính toán, không dùng ảnh chụp.** Công cụ chụp ảnh không ghi tệp xuống đĩa. Đọc `getComputedStyle` và biến CSS từ app đang chạy thì so được từng px bằng máy.

**Đường dẫn dùng `Id` số của khách, không dùng CIF.** CIF là định danh khách hàng thật, nó sẽ nằm trong lịch sử trình duyệt và log máy chủ.

---

## Việc còn treo — chưa ai làm

| Việc | Mức | Ghi chú |
| :--- | :--- | :--- |
| Dòng `inv-test-1` (*"Lúa Nếp 5421"*) nằm trong bảng `InventoryItems` sản xuất | **cần chủ dự án** | Do test cũ ghi vào trước khi bịt. Chỉ chủ dự án được xoá dữ liệu thật |
| `DocumentTemplateExport.test.tsx` còn *đọc* bảng `SaleCatalogProfiles` thật mỗi lần chạy test | trung bình | Không ghi, chỉ đọc. Cần `vi.mock` |
| `package-lock.json` ghi `version: 0.0.0` lệch `package.json` `2.5.0` | thấp | Sửa bằng một lần `npm install`. `npm ci` không phàn nàn |
| `CONTRAST_PAIRS` bỏ sót cặp `fg` trên nền `*-soft` | trung bình | Ví dụ `accent` trên `accent-soft` (49 tệp dùng). Đo thử đều đạt AA nhưng sát |
| Bẫy thứ tự nguồn CSS cho đợt 3–7 | **quan trọng** | Khối ghi đè `.text-xs` ở cuối `index.css` nằm SAU tầng utilities, nên nó **thắng** mọi lớp `text-[var(--fs-body)]` sinh sau. Màn nào chuyển sang biến ngữ nghĩa mà còn giữ `text-xs` sẽ âm thầm giữ cỡ cũ |
| Thứ tự hiển thị Sidebar không có test giữ | thấp | Đảo hai mục thì mọi test vẫn xanh |
| `screenIdOfPath` lệch bộ định tuyến ở URL không chuẩn tắc | thấp | `/DASHBOARD` render đúng nhưng `screenIdOfPath` trả `null`. Vô hại hôm nay vì không ai đọc kết quả đó |
| Back xoá âm thầm biểu mẫu KUNN đang điền dở | trung bình — đợt 3 | Sau khi "Giải ngân từ HĐTD" nhảy sang `/loans` với form điền sẵn, một lần Back là mất. Không phải hồi quy, nhưng Back nay là nút sống nên dễ bấm nhầm. Cần chốt "chưa lưu" |
| RLS gọi `can_access_contract` từng dòng trên `RepaymentSchedules` | **quan trọng** | Bốn controller vẫn đọc lịch trả nợ thô, 31–66 ms mỗi KUNN, 180–400 ms cho khách 6 KUNN. Cách chữa là đổi hàm RLS sang lọc theo tập hợp thay vì gọi theo dòng, hoặc thêm view gộp — đụng CSDL sản xuất, cần chủ dự án duyệt. Xem `ContractPaidPrincipal` ở `CONVENTIONS.md` §15 cho hướng đã dùng |
| Tự kiểm đợt 1b trên giao diện thật **chưa làm** | **quan trọng** | Danh sách 19 màn, deep-link, F5, Back, giải ngân qua URL nằm ở Task 17 trong kế hoạch đợt 1b — chưa có phiên nào chạy qua trình duyệt thật để xác nhận |
| `?disburse=` không hợp lệ không bị dọn khỏi URL | trung bình | Nằm lại trong lịch sử trình duyệt và link chia sẻ. Cố ý hoãn: dọn sớm rủi ro xoá mất tham số hợp lệ trước khi `creditContracts` nạp xong, đổi rác URL vô hại lấy nguy cơ hỏng luồng giải ngân |
| URL lồng dị dạng (`/customers/abc/collaterals`) cho `customerId = null` | trung bình | Màn lặng lẽ hiện dữ liệu của **mọi** khách thay vì báo lỗi hay chuyển hướng. Áp cho cả năm màn có phạm vi khách |
| `fetchCustomersAPI()` nạp tới 1000 khách rồi tìm ở trình duyệt | thấp | Không lọc theo Id ở máy chủ. Khách nằm sau mốc 1000 sẽ lặng lẽ hiện "không tìm thấy" |
| `/customers/:id/profile` cho khách không có trong danh sách đã nạp | thấp | Mắc kẹt ở `/profile` — không ngăn kéo, không chuyển hướng |
| `AbortError` từ fetch bị huỷ bị tính như mất kết nối thật | thấp | Cờ lỗi API mới (`apiHealth.ts`) chưa phân biệt fetch bị huỷ với máy chủ thật sự không với tới được. Suy đoán, chưa gặp thật |

---

## Bài học đã trả giá trong dự án này

**Test tự khẳng định chính nó.** Đã dính ba lần ở đợt 0: `Sidebar.test.tsx` lặp qua chính `NAV_ITEMS` để dựng kỳ vọng; `contrast.test.ts` làm rỗng `CONTRAST_PAIRS` thì tụt từ 36 xuống 6 test mà vẫn xanh. Viết test xong phải **tự phá dữ liệu đầu vào rồi xem nó có đỏ không**.

**Test ghi vào cơ sở dữ liệu sản xuất.** `inventoryDb.test.ts` và `statementDb.test.ts` đặt tên là *"on DB fallback"* nhưng không `vi.mock`, nên `npm test` ghi thẳng vào bảng thật. Đã bịt cả hai. Phép thử chắc chắn nhất: đổi tên `.env` rồi chạy lại, test vẫn phải xanh.

**Tài liệu nói sai hiện trạng.** `CONVENTIONS.md` từng lệch khỏi mã ở bảy chỗ. Khi viết tài liệu, phân biệt rõ đâu là **đích** đâu là **hiện trạng**, kèm con số thật.

**Chẩn đoán từ triệu chứng.** Tôi từng xếp `inventoryDb.test.ts` là "test chập chờn" vì nó đỏ khi chạy chung, xanh khi chạy riêng — mà không truy tới nguyên nhân. Nguyên nhân thật là nó gọi mạng.

**Test tự khẳng định chính nó, phiên bản thứ tư.** Đợt 1b lặp lại đúng lỗi của đợt 0, bốn lần
khác nhau, và cả bốn đều bắt nguồn từ kế hoạch tôi viết chứ không phải từ tay implementer: một
test dựng view đã `vi.mock` nên không hề gọi hook đang kiểm; một assertion `.bg-g3` trong jsdom
không phân biệt được bảng tra hợp lệ với chuỗi lớp dựng động sai; một test cho `replace: true`
vẫn xanh khi bỏ hẳn `replace`; một test trạng thái đang tải mô phỏng tổ hợp mà hook thật không
bao giờ phát ra. Cách duy nhất bắt được cả bốn: **phá mã có chủ đích và bắt buộc thấy đỏ trước
khi chấp nhận test là xanh vì đúng lý do**. Đọc test và thấy nó "có vẻ đúng" không đủ.

---

## Lệnh thường dùng

```bash
npm run dev        # máy chủ phát triển — dùng mcp__Claude_Browser__preview_start, đừng chạy qua Bash
npm run build      # kiểm kiểu + đóng gói
npm test           # 1.825 test
npm run lint
```
