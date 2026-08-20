# Rebuild giao diện — trạng thái hiện tại

> Tệp này để **bắt lại mạch khi mở phiên trò chuyện mới**. Cập nhật sau mỗi task xong.
> Sổ chi tiết của phiên đang chạy nằm ở `.superpowers/sdd/<tên-kế-hoạch>/progress.md`, nhưng thư mục đó bị `.gitignore` bỏ qua và bị xoá khi đóng đợt — nên mọi thứ cần sống lâu phải nằm ở đây.

**Cập nhật lần cuối:** 2026-08-20, sau khi đợt 1a đã gộp và đẩy lên `main`.

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
| Đợt vừa xong | **1a — định tuyến**, 21 commit, đã gộp và đẩy (`c5ebd57..b0b6653`) |
| Đợt kế tiếp | **1b — ngữ cảnh khách hàng**, chưa lập kế hoạch |
| Tổng test | **1.732** xanh, 0 đỏ · 72 tệp test |
| Cảnh báo lint | 62, toàn bộ có sẵn từ trước |

## Đợt 1b sẽ làm gì

Theo bản thiết kế §6.2. Chưa lập kế hoạch — cần lập trước khi thi công.

- `useSelectedCustomer()` đọc `:id` từ URL; **xoá `selectedCustomerId` khỏi `WorkContext`**, URL thành nguồn sự thật duy nhất
- Thanh ngữ cảnh khách hàng: tên · CIF · điện thoại · dư nợ · hạn mức khả dụng · nhóm nợ · nút đổi khách
- Lồng sáu màn hồ sơ vào `/customers/:id/…`
- Chuyển bốn controller khỏi `WorkContext.selectedCustomerId`: `useCardContractController`, `useCreditContractController`, `useLoanPortfolioController`, `usePostLoanControlController`
- `disburseRequest` chuyển sang điều hướng URL
- Bù nốt nửa spec §6.3 còn thiếu ở Header (xem việc còn treo)

**Phải đo trước khi lập kế hoạch:** thanh ngữ cảnh cần dư nợ và hạn mức khả dụng, hai số đó tính từ `summarizeCreditContracts` trên hợp đồng tín dụng + khoản vay + lịch trả nợ. Bốn controller hiện mỗi cái tự nạp một bản riêng. **Đo độ trễ truy vấn thật trước khi quyết** nạp chung hay nạp riêng — dự án đã một lần đếm 6.705 dòng rồi tưởng nhẹ và làm dashboard chậm gấp bảy lần.

**URL đã chạy thật.** Bấm mục thanh bên → đường dẫn đổi; F5 → giữ nguyên chỗ; Back → quay về màn trước; đường dẫn lạ → về `/dashboard`. Đã tự kiểm cả 19 màn trên giao diện thật, không màn nào trắng, không lỗi console.

**Đường dẫn viết tiếng Anh** — chủ dự án chốt 20/08/2026 để tránh rắc rối mã hoá và công cụ:

| Nhóm | Đường dẫn |
| :--- | :--- |
| Tổng quan | `/dashboard` |
| Hồ sơ tín dụng | `/customers` · `/credit-contracts` · `/loans` · `/collaterals` · `/credit-cards` |
| Công cụ | `/tools/calculators` · `/tools/business-plan` · `/tools/inventory` · `/tools/purchase-statement` · `/tools/retail-invoice` · `/tools/rate-quote` · `/tools/cost-of-funds` |
| Tra cứu | `/reference/loan-purpose` · `/reference/card-policies` · `/reference/templates` · `/reference/quiz` |
| Kiểm soát | `/post-loan-control` · `/settings` |

Đợt 1b sẽ lồng sáu màn hồ sơ vào `/customers/:id/…`.

**Cầu tạm cần gỡ ở đợt 3–7:** chỉ còn `WorkContext.setActiveTab` — nó giữ chữ ký cũ `(t: string) => void` nhưng ghi bằng `navigate(ROUTE_OF[tab])`. `activeTab` **đã gỡ hẳn** ở đợt 1a vì không component nào đọc nó mà lại buộc `WorkProvider` gọi `useLocation()`, khiến cả cây provider render lại mỗi lần điều hướng. Ba tệp còn gọi `setActiveTab`: `WorkContext.tsx` (nội bộ ở `requestDisburse`), `CustomerListView.tsx`, `DashboardView.tsx`.

**Thêm màn phải sửa BA chỗ**, không phải hai: `routes.ts` · `navigation.ts` · `App.tsx`. Quên chỗ thứ ba thì mục menu vẫn hiện nhưng bấm vào lặng lẽ về `/dashboard`. `routing.test.tsx` nay bắt được lỗi đó.

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
| **1b** | `useSelectedCustomer` đọc `:id`, thanh ngữ cảnh khách hàng, chuyển 4 controller, luồng giải ngân qua URL | ⬅️ **kế tiếp**, chưa lập kế hoạch |
| **2** | Bộ component + `Dialog`/`ConfirmDialog` — thay 15 modal và 13 tệp `window.confirm` | chưa |
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
| **Header mới làm nửa spec §6.3** | **quan trọng — đợt 1b** | Có `navigator.onLine`, **thiếu** "cờ lỗi từ lần gọi API thật gần nhất". Hệ quả: chấm vẫn xanh "Trực tuyến" khi Supabase không với tới được (token hết hạn, rớt VPN). Với hệ tín dụng, chấm xanh lúc lệnh lưu đang hỏng là tín hiệu sai. Cần một kênh ghi nhận lỗi API dùng chung — nằm trong `src/lib/api/`, thư mục đợt 1a bị cấm đụng |
| `screenIdOfPath` lệch bộ định tuyến ở URL không chuẩn tắc | thấp | `/DASHBOARD` render đúng nhưng `screenIdOfPath` trả `null`. Vô hại hôm nay vì không ai đọc kết quả đó |
| `SCREEN_OF_PATH` xuất ra chỉ để test của chính nó dùng | thấp | Đợt 1b sẽ dùng thật khi đọc `/customers/:id/...` |
| Back xoá âm thầm biểu mẫu KUNN đang điền dở | trung bình — đợt 3 | Sau khi "Giải ngân từ HĐTD" nhảy sang `/loans` với form điền sẵn, một lần Back là mất. Không phải hồi quy, nhưng Back nay là nút sống nên dễ bấm nhầm. Cần chốt "chưa lưu" |

---

## Bài học đã trả giá trong dự án này

**Test tự khẳng định chính nó.** Đã dính ba lần ở đợt 0: `Sidebar.test.tsx` lặp qua chính `NAV_ITEMS` để dựng kỳ vọng; `contrast.test.ts` làm rỗng `CONTRAST_PAIRS` thì tụt từ 36 xuống 6 test mà vẫn xanh. Viết test xong phải **tự phá dữ liệu đầu vào rồi xem nó có đỏ không**.

**Test ghi vào cơ sở dữ liệu sản xuất.** `inventoryDb.test.ts` và `statementDb.test.ts` đặt tên là *"on DB fallback"* nhưng không `vi.mock`, nên `npm test` ghi thẳng vào bảng thật. Đã bịt cả hai. Phép thử chắc chắn nhất: đổi tên `.env` rồi chạy lại, test vẫn phải xanh.

**Tài liệu nói sai hiện trạng.** `CONVENTIONS.md` từng lệch khỏi mã ở bảy chỗ. Khi viết tài liệu, phân biệt rõ đâu là **đích** đâu là **hiện trạng**, kèm con số thật.

**Chẩn đoán từ triệu chứng.** Tôi từng xếp `inventoryDb.test.ts` là "test chập chờn" vì nó đỏ khi chạy chung, xanh khi chạy riêng — mà không truy tới nguyên nhân. Nguyên nhân thật là nó gọi mạng.

---

## Lệnh thường dùng

```bash
npm run dev        # máy chủ phát triển — dùng mcp__Claude_Browser__preview_start, đừng chạy qua Bash
npm run build      # kiểm kiểu + đóng gói
npm test           # 1.732 test
npm run lint
```
