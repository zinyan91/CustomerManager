# Đợt 3 — Nợ cấu trúc nhóm hồ sơ tín dụng

> **Cho người thi công:** BẮT BUỘC dùng kỹ năng `superpowers:subagent-driven-development` để thi công từng task một. Các bước dùng ô đánh dấu (`- [ ]`).

**Mục tiêu:** Gỡ nợ cấu trúc của năm màn hồ sơ tín dụng — chuỗi class truyền qua props, `KunnForm` 65 props, `AdaptiveTable` trùng vai với `DataTable`, luật nghiệp vụ nằm trong JSX — **mà không đổi một pixel nào** trên giao diện.

**Kiến trúc:** Không dựng component mới. Tiêu thụ bộ component đợt 2 đã có (`Panel`, `DataTable`, `Field`, `Button`), gỡ props chuỗi class để component đọc token trực tiếp, gom 65 props của `KunnForm` thành các đối tượng cụm khớp năm section con nó đã có, và rút luật nghiệp vụ còn nằm trong JSX xuống `src/lib/` để có test giữ.

**Công nghệ:** React 19 · TypeScript · Vite · Vitest + Testing Library · Tailwind (token ngữ nghĩa).

**Bản thiết kế:** `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md` — §5 (bộ component dùng chung, **luật cứng** về props chuỗi class), §11 (rủi ro đợt 3).

**Trạng thái nền:** `docs/superpowers/TRANG-THAI.md`

---

## Vì sao đợt này khác bản thiết kế mô tả

Bản thiết kế viết đợt 3 là "rebuild diện mạo năm màn hồ sơ tín dụng". **Việc đó chủ dự án đã tự làm bằng tay** trong các commit `4407fcd`, `c7611ec`, `5764057`, `d26c5fe`, `0ca9b69` (18–21/08/2026): TSĐB dựng lại toàn bộ, Khoản vay gộp thành Cockpit Action Center, và một đợt đại tu FinTech Cockpit quét rộng.

Chủ dự án chốt 21/08/2026: **đợt 3 làm nợ cấu trúc, không đụng diện mạo.**

Vì thế mọi task dưới đây phải giữ giao diện y nguyên, và mỗi task đều có bước chứng minh điều đó bằng dấu vân tay giá trị tính toán.

## Hiện trạng đo được 21/08/2026

| Đo | Số thật |
| :--- | ---: |
| Tệp toàn dự án còn truyền chuỗi class qua props | **90** |
| Trong đó thuộc cây đợt 3 | **20** |
| Props của `KunnForm` | **65** (6 là chuỗi class) |
| Nơi dùng `DataTable` (dựng ở đợt 2) | **0** |
| Nơi dùng `AdaptiveTable` (cái §5 bảo thay) | **4** + chính nó |
| Tự dựng `bg-panel border border-line` thay vì `Panel` | **6** |
| Test hiện có | 1.884 xanh / 103 tệp |

**Rủi ro §11 đã vơi.** Bản thiết kế lo ràng buộc hạn mức nằm ở tầng trình bày nơi test không với tới. Rà 21/08/2026: ràng buộc **đã** ở `src/lib/` và có test — `checkKunnAgainstContract`, `checkKunnTenor`, `checkCollateralCapacity`, `checkLoanAmount`, `checkMonthlyPrincipal`, `computeLimitGroups`, `findLimitGroupFor`, `totalUsableCapacity`. `KunnForm` và năm section con phần lớn chỉ **hiển thị** kết quả. Còn sót luật nằm thẳng trong JSX — Task 7 xử.

---

## Ràng buộc toàn cục

Áp cho **mọi** task, không nhắc lại ở từng task:

- **Không đổi diện mạo.** Đây là ràng buộc số một của đợt này. Mọi task đụng `.tsx` phải chứng minh bằng dấu vân tay `getComputedStyle` trước/sau (xem "Cách chứng minh không đổi diện mạo").
- **Không chú thích trong mã.** Giải thích "vì sao" thuộc `CONVENTIONS.md`.
- **Không dựng component mới.** Bộ đợt 2 ở `src/components/ui/` đã đủ. Cần thứ chưa có thì dừng và báo.
- **Component không nhận chuỗi class qua props** — luật cứng §5. Xoá `containerCardBg`, `sectionBoxBg`, `inputStyle`, `readonlyInputStyle`, `labelStyle`, `tableHeaderStyle`, `styles`, `cardBg` khỏi mọi chữ ký. Component đọc token trực tiếp từ `src/lib/uiClasses.ts`.
- **Không đổi thang chữ.** 145 chỗ dùng `text-xs` trong cây đợt 3 giữ nguyên. Chuyển sang `--fs-*` sẽ đổi cỡ chữ, trái mục tiêu đợt này — đã ghi thành việc còn treo.
- Dùng ở hai nơi trở lên thì rút về `src/lib/`.
- **Tests không được gọi mạng.**
- **Test yếu hơn tên nó hứa là khiếm khuyết.** Đợt 1b dính năm lần, cả năm đều bắt nguồn từ kế hoạch. Viết test xong phải **phá mã có chủ đích, thấy đỏ thật, trích dòng đỏ vào báo cáo**, rồi khôi phục. Mô tả suông không tính.
- **`src/lib/` chuyển đỏ là dấu hiệu rebuild lấn sang tầng nghiệp vụ** — dừng lại và báo, đừng sửa test cho xanh (§9 bản thiết kế).
- Chạy test trọng tâm khi làm; chạy `npm test` và `npm run build` một lần trước khi commit. Không tụt dưới **1.884 xanh / 103 tệp**.
- **Không `git add -A` hay `git add .`** — chủ dự án commit song song trong cùng cây. Stage đúng tên tệp. Không `git stash`, không `git checkout`/`switch`/`reset`/`rebase`.
- **Không tự commit khi chưa được lệnh** — trừ khi chủ dự án nói trực tiếp trong đợt đó. Ghi ở `TRANG-THAI.md` mục "Ràng buộc đặc biệt". Mỗi task kết thúc bằng việc **đề nghị** commit kèm thông điệp gợi ý, để chủ dự án quyết.

### Cách chứng minh không đổi diện mạo

Phán quyết còn hiệu lực của dự án: **mốc đối chiếu dùng dấu vân tay giá trị tính toán, không dùng ảnh chụp** — công cụ chụp ảnh không ghi tệp xuống đĩa, còn `getComputedStyle` thì so được từng px bằng máy.

Trước khi sửa một màn, mở nó trong trình duyệt (`mcp__Claude_Browser__preview_start`, cấu hình `web`) và ghi lại dấu vân tay:

```js
(()=>{const el=document.querySelector('main');const out=[];
el.querySelectorAll('*').forEach(n=>{const c=getComputedStyle(n);
out.push([n.tagName,c.fontSize,c.fontWeight,c.color,c.backgroundColor,c.borderRadius,c.padding,c.margin].join('|'))});
out.sort();
const s=out.join(String.fromCharCode(10));let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0}
return JSON.stringify({count:out.length,len:s.length,hash:h})})()
```

**`out.sort()` là bắt buộc, không phải làm đẹp.** Bản không sắp xếp đo cùng một màn ba lần ra ba hash khác nhau, vì thứ tự phần tử phụ thuộc lúc dữ liệu bất đồng bộ về. Đã đo thật 21/08/2026: bản không sắp xếp cho `len` lệch 5 ký tự giữa hai tab chạy **cùng một mã**, còn bản sắp xếp cho kết quả giống hệt. Vân tay không ổn định còn tệ hơn không có vân tay — nó tạo báo động giả rồi khiến người ta quen bỏ qua.

Sau khi sửa, chạy lại và so cả ba số `count`, `len`, `hash`. Lệch thì **dừng và báo**, đừng tự quyết là "chấp nhận được".

**Không nhập mật khẩu vào form đăng nhập.** Nếu ra màn đăng nhập thì nhờ chủ dự án tự đăng nhập rồi dùng phiên đó. **Không xoá `localStorage`.**

---

## Cấu trúc tệp

### Sửa — cây đợt 3 (20 tệp còn truyền chuỗi class)

| Nhóm | Tệp |
| :--- | :--- |
| Màn | `views/CustomerListView.tsx` · `views/CreditContractView.tsx` · `views/LoanPortfolioView.tsx` · `views/CardContractView.tsx` |
| KUNN | `portfolio/KunnForm.tsx` · `portfolio/kunn/KunnAmountSection.tsx` · `KunnCollateralSection.tsx` · `KunnHdtdSection.tsx` · `KunnRateSection.tsx` · `KunnRepaymentSection.tsx` · `portfolio/KunnTable.tsx` · `portfolio/PaymentModal.tsx` |
| Khoản vay | `portfolio/CustomerSearchBar.tsx` · `portfolio/CustomerSummaryHeader.tsx` |
| TSĐB | `collateral/CollateralForm.tsx` · `collateral/CollateralSearchBar.tsx` · `collateral/CollateralTable.tsx` |
| HĐTD | `creditContract/CreditContractFormModal.tsx` · `creditContract/CreditContractSummaryCards.tsx` |
| Khách hàng | `customer/CustomerDrawerForm.tsx` |

### Sửa — ngoài cây đợt 3, cần cho việc xoá `AdaptiveTable`

`views/DashboardView.tsx` · `views/PostLoanControlView.tsx` · `dashboard/DueSectionPanel.tsx`

### Xoá

`src/components/AdaptiveTable.tsx` và test của nó — sau khi bốn nơi dùng đã chuyển sang `DataTable`.

### Tạo

`src/lib/kunnFormRules.ts` + test — nơi chứa luật nghiệp vụ rút từ JSX (Task 7).

---

## Task 1: Dấu vân tay diện mạo trước khi sửa

**Tệp:** không sửa mã. Chỉ ghi tệp mốc vào thư mục làm việc của đợt.

Task này tồn tại vì mọi task sau đều phải chứng minh không đổi diện mạo, và mốc phải chụp **trước** khi có thay đổi nào.

- [ ] **Bước 1: Mở máy chủ phát triển**

Dùng `mcp__Claude_Browser__preview_start` với cấu hình `web`. Đừng chạy `npm run dev` qua Bash.

Nếu ra màn đăng nhập: **không nhập mật khẩu**, nhờ chủ dự án đăng nhập một lần rồi dùng phiên đó.

- [ ] **Bước 2: Ghi dấu vân tay bảy màn**

Với từng đường dẫn dưới đây, chạy đoạn JS ở mục "Cách chứng minh không đổi diện mạo" và lưu kết quả:

```
/customers
/customers/55/credit-contracts
/customers/55/loans
/customers/55/collaterals
/customers/55/credit-cards
/dashboard
/post-loan-control
```

Khách 55 (`KHU HOÀNG THÔNG`, CIF 005184807) có 1 TSĐB, 1 HĐTD, 6 KUNN — đủ để mọi bảng và mọi thẻ tổng có dữ liệu thật.

Lưu vào `<workspace>/moc-dien-mao.json`, mỗi đường dẫn một khoá.

- [ ] **Bước 3: Ghi thêm mốc ở 375px**

Đổi khung nhìn bằng `mcp__Claude_Browser__resize_window` preset `mobile`, chạy lại đoạn JS cho ba màn nặng bảng nhất (`/customers`, `/customers/55/loans`, `/customers/55/collaterals`), lưu vào cùng tệp dưới khoá `375px`.

Lý do: `DataTable` và `AdaptiveTable` đổi hình dạng ở điểm ngắt `md`. Chỉ đo ở màn rộng thì không thấy hồi quy ở thẻ dọc.

- [ ] **Bước 4: Báo lại**

Trong báo cáo ghi rõ: đã đo mấy màn, `count` và `hash` của từng màn, và có màn nào không nạp được dữ liệu (bảng rỗng thì dấu vân tay yếu, phải nói ra).

---

## Task 2: `AdaptiveTable` → `DataTable`, rồi xoá bản cũ

**Tệp:**
- Sửa: `src/components/views/CustomerListView.tsx`, `src/components/views/DashboardView.tsx`, `src/components/views/PostLoanControlView.tsx`, `src/components/dashboard/DueSectionPanel.tsx`
- Xoá: `src/components/AdaptiveTable.tsx` và test của nó
- Test: `src/components/ui/__tests__/DataTable.test.tsx` (đã có, mở rộng nếu cần)

**Giao diện:**
- Tiêu thụ: `DataTable`, `ColumnDef` từ `src/components/ui/DataTable.tsx`
- Sản xuất: không có API mới.

**Vì sao an toàn.** Đã so hai chữ ký: `ColumnDef<T>` là **tập cha** của `AdaptiveColumn<T>` (thêm `width?`, `priority` thành tuỳ chọn), và `DataTableProps<T>` là tập cha của `AdaptiveTableProps<T>` (thêm `stickyHeader?`, `className?`, `emptyText` thành tuỳ chọn). Nên đây là đổi import và đổi tên kiểu, không phải viết lại.

**Ba trong bốn nơi dùng thuộc đợt 4** (`DashboardView`, `PostLoanControlView`, `DueSectionPanel`). Vẫn làm cả bốn, vì để lại một component trùng vai là mời gọi hai bản trôi dạt khỏi nhau — đúng cái giá dự án đã trả với `getEffectiveLtv`. Chỉ đổi cách gọi bảng, không đụng gì khác trong ba tệp đó.

**`className` của `DataTable` là props chuỗi class** — vi phạm luật cứng §5. Task này **không** dùng nó. Nếu chỗ nào buộc phải dùng thì dừng và báo, đừng lặng lẽ truyền vào.

- [ ] **Bước 1: Ghi dấu vân tay ba màn có bảng**

`/customers`, `/dashboard`, `/post-loan-control`, ở cả khung rộng và 375px. So với `moc-dien-mao.json` của Task 1 — phải khớp trước khi bắt đầu (nếu đã lệch thì có người sửa xen vào, dừng và báo).

- [ ] **Bước 2: Đổi bốn nơi dùng**

Ở mỗi tệp: đổi `import { AdaptiveTable, type AdaptiveColumn }` thành `import { DataTable, type ColumnDef }`, đổi `AdaptiveColumn<T>` thành `ColumnDef<T>`, đổi thẻ `<AdaptiveTable` thành `<DataTable`. Không đổi cột, không đổi `priority`, không thêm `stickyHeader`.

- [ ] **Bước 3: Chạy test**

```bash
npm test
```

Kỳ vọng: XANH, không tụt dưới 1.884.

- [ ] **Bước 4: So dấu vân tay**

Chạy lại đoạn JS cho ba màn ở cả hai khung nhìn. `count` và `hash` phải khớp Bước 1 **từng ký tự**.

Lệch thì **dừng và báo**, kèm dòng lệch đầu tiên. Đừng tự phán là chấp nhận được — hai bảng có cùng API không có nghĩa là render ra cùng DOM.

- [ ] **Bước 5: Xoá `AdaptiveTable`**

```bash
git rm src/components/AdaptiveTable.tsx
```

Xoá luôn tệp test của nó nếu có. Rồi quét:

```bash
rg "AdaptiveTable" src
```

Kỳ vọng: không ra dòng nào.

- [ ] **Bước 6: Chạy lại và đề nghị commit**

```bash
npm test && npm run build
```

Rồi **đề nghị** chủ dự án commit với thông điệp `refactor(bang): doi 4 noi dung AdaptiveTable sang DataTable va xoa ban cu`. Đừng tự commit.

---

## Task 3: Gỡ chuỗi class khỏi bốn màn

**Tệp:**
- Sửa: `views/CustomerListView.tsx`, `views/CreditContractView.tsx`, `views/LoanPortfolioView.tsx`, `views/CardContractView.tsx`

Bốn màn này vừa **nhận** vừa **truyền tiếp** chuỗi class. Task này xử phần chúng tự dùng và phần chúng truyền xuống component con mà con đó không còn cần (sau Task 4–6).

Thứ tự: làm task này **trước** Task 4–6 để chữ ký con thu hẹp dần từ trên xuống, tránh phải sửa hai lần.

- [ ] **Bước 1: Ghi dấu vân tay bốn màn**

Chạy đoạn JS ở mục "Cách chứng minh không đổi diện mạo" cho `/customers`, `/customers/55/credit-contracts`, `/customers/55/loans`, `/customers/55/credit-cards`, ở cả khung rộng và 375px. So với `moc-dien-mao.json` của Task 1 — phải khớp **trước** khi bắt đầu. Đã lệch nghĩa là có người sửa xen vào: dừng và báo.

- [ ] **Bước 2: Liệt kê chỗ dùng**

```bash
grep -nE "containerCardBg|sectionBoxBg|inputStyle|readonlyInputStyle|labelStyle|tableHeaderStyle|cardBg" src/components/views/CustomerListView.tsx src/components/views/CreditContractView.tsx src/components/views/LoanPortfolioView.tsx src/components/views/CardContractView.tsx
```

Ghi số lượng vào báo cáo trước khi sửa, để đối chiếu sau.

- [ ] **Bước 3: Thay tại chỗ**

Mỗi chỗ `UI.containerCardBg` → dùng `PANEL` từ `src/lib/uiClasses.ts`, `UI.inputStyle` → chuỗi token tương ứng, v.v. **Giá trị chuỗi phải giống hệt** — đây là đổi nơi lấy chuỗi, không phải đổi chuỗi.

Nếu một chỗ nào đó chuỗi trong `UI.*` khác chuỗi trong hằng của `uiClasses.ts`, **dừng và báo** — đó là hai định nghĩa đã trôi khỏi nhau, và hợp nhất chúng sẽ đổi diện mạo.

- [ ] **Bước 4: So dấu vân tay**

Chạy lại đoạn JS cho bốn màn ở Bước 1, cả hai khung nhìn. `count` và `hash` phải khớp **từng ký tự**. Lệch thì dừng và báo, kèm dòng lệch đầu tiên — đừng tự phán là chấp nhận được.

- [ ] **Bước 5: Chạy test, đề nghị commit**

```bash
npm test && npm run build
```

Thông điệp gợi ý: `refactor(man-ho-so): bon man doc token truc tiep, thoi truyen chuoi class`.

---

## Task 4: Gỡ chuỗi class khỏi cây TSĐB và HĐTD

**Tệp:**
- Sửa: `collateral/CollateralForm.tsx`, `collateral/CollateralSearchBar.tsx`, `collateral/CollateralTable.tsx`, `creditContract/CreditContractFormModal.tsx`, `creditContract/CreditContractSummaryCards.tsx`, `customer/CustomerDrawerForm.tsx`

Sáu tệp, cùng một hình dạng việc: xoá props chuỗi class khỏi chữ ký, đọc token trực tiếp, và xoá luôn chỗ truyền vào ở component cha (đã gỡ ở Task 3 nếu cha là một trong bốn màn).

**Cảnh báo về `CollateralForm`/`CollateralTable`/`CollateralSearchBar`:** chủ dự án vừa dựng lại toàn bộ ba tệp này ở `d26c5fe` và `0ca9b69` (20–21/08/2026). Đọc mã hiện tại, đừng tin số dòng hay hình dạng cũ.

- [ ] **Bước 1: Ghi dấu vân tay** — `/customers/55/collaterals`, `/customers/55/credit-contracts`, `/customers` (ngăn kéo hồ sơ mở), cả hai khung nhìn.

- [ ] **Bước 2: Liệt kê chỗ dùng**

```bash
grep -nE "containerCardBg|sectionBoxBg|inputStyle|readonlyInputStyle|labelStyle|tableHeaderStyle|cardBg" src/components/collateral/CollateralForm.tsx src/components/collateral/CollateralSearchBar.tsx src/components/collateral/CollateralTable.tsx src/components/creditContract/CreditContractFormModal.tsx src/components/creditContract/CreditContractSummaryCards.tsx src/components/customer/CustomerDrawerForm.tsx
```

Ghi số lượng vào báo cáo trước khi sửa, để đối chiếu sau.

- [ ] **Bước 3: Xoá khỏi chữ ký, đọc token trực tiếp**

Ở mỗi tệp: xoá props chuỗi class khỏi `interface ...Props`, thay chỗ dùng bằng hằng tương ứng từ `src/lib/uiClasses.ts` (`PANEL`, `UI.inputStyle` → chuỗi token tương ứng), và xoá chỗ truyền vào ở component cha.

**Giá trị chuỗi phải giống hệt** — đây là đổi nơi lấy chuỗi, không phải đổi chuỗi. Nếu chuỗi trong `UI.*` khác chuỗi trong hằng của `uiClasses.ts`, **dừng và báo**: đó là hai định nghĩa đã trôi khỏi nhau, hợp nhất chúng sẽ đổi diện mạo.

- [ ] **Bước 4: So dấu vân tay**

Chạy lại đoạn JS cho ba màn ở Bước 1, cả hai khung nhìn. `count` và `hash` phải khớp **từng ký tự**. Lệch thì dừng và báo, kèm dòng lệch đầu tiên.

- [ ] **Bước 5: Chạy test, đề nghị commit**

```bash
npm test && npm run build
```

Thông điệp gợi ý: `refactor(tsbd-hdtd): go chuoi class khoi chu ky sau component`.

---

## Task 5: Gom 65 props của `KunnForm` — phần lãi suất

**Tệp:**
- Sửa: `portfolio/KunnForm.tsx`, `portfolio/kunn/KunnRateSection.tsx`
- Sửa nơi gọi: `views/LoanPortfolioView.tsx`

**Giao diện:**
- Sản xuất: `interface KunnRateProps` trong `KunnForm.tsx`, gom **20 props lãi suất** thành một đối tượng.

Đây là cụm lớn nhất trong 65. Các props gom vào:

```
interestRateMode, setInterestRateMode, ratePreferential, setRatePreferential,
ratePreferentialMonths, setRatePreferentialMonths, rateBase, setRateBase,
rateMargin, setRateMargin, postPrefRate, normalRate, surchargeVal,
currentActiveRateDisplay, rateConditionSurcharge, setRateConditionSurcharge,
rateFloor, setRateFloor, rateHistory, setRateHistory
```

**Không dựng context.** Đợt 1b vừa xoá hẳn `WorkContext` để bỏ trạng thái ẩn; thêm `KunnFormContext` bây giờ là đi ngược. Gom thành đối tượng props, giữ nguyên năm section con đã có.

**Không đổi hành vi.** Đây là đổi hình dạng tham số, không đổi một phép tính nào. `KunnRateSection` nhận `rate.ratePreferential` thay vì `ratePreferential` — hết.

- [ ] **Bước 1: Ghi dấu vân tay** `/customers/55/loans` với form KUNN **đang mở**

Mở form bằng cách bấm "Giải ngân KUNN mới", rồi chạy đoạn JS. Form đóng thì dấu vân tay không phủ phần cần bảo vệ nhất.

- [ ] **Bước 2: Gom props**

Khai `interface KunnRateProps` với 20 trường trên, đổi `KunnFormProps` để nhận `rate: KunnRateProps` thay cho 20 props rời, và `KunnRateSection` nhận `rate` thay vì 20 props rời.

- [ ] **Bước 3: Sửa nơi gọi**

`LoanPortfolioView` dựng đối tượng `rate` từ những gì controller trả về. Không đổi controller.

- [ ] **Bước 4: Đếm lại props**

```bash
awk '/^(export )?interface KunnFormProps/,/^}/' src/components/portfolio/KunnForm.tsx | grep -cE '^\s+\w+[?]?:'
```

Kỳ vọng: **46** (65 − 20 + 1).

- [ ] **Bước 5: So dấu vân tay, chạy test, đề nghị commit**

Thông điệp gợi ý: `refactor(kunn): gom 20 props lai suat thanh mot doi tuong`.

---

## Task 6: Gom nốt `KunnForm` — điều chỉnh lãi, hạn mức, số tiền, và sáu chuỗi class

**Tệp:**
- Sửa: `portfolio/KunnForm.tsx`, cả năm tệp trong `portfolio/kunn/`, `portfolio/KunnTable.tsx`, `portfolio/PaymentModal.tsx`, `portfolio/CustomerSearchBar.tsx`, `portfolio/CustomerSummaryHeader.tsx`
- Sửa nơi gọi: `views/LoanPortfolioView.tsx`

Ba cụm còn lại cộng sáu chuỗi class:

| Cụm | Props gom |
| :--- | :--- |
| `adjustment` | `newAdjDate/setNewAdjDate`, `newAdjBaseRate/set…`, `newAdjMargin/set…`, `newAdjPenalty/set…`, `newAdjReason/set…` — **10** |
| `limit` | `formLimitStatus`, `kunnIssues`, `formGrantedLimit`, `totalExistingKunnBalance`, `availableBeforeThisKunn`, `remainingHmtdLimit` — **6** |
| `amount` | `formLoanAmount/setFormLoanAmount`, `formMonthlyPrincipal/setFormMonthlyPrincipal`, `suggestedMonthlyPrincipal` — **5** |
| chuỗi class | `containerCardBg`, `sectionBoxBg`, `inputStyle`, `readonlyInputStyle`, `labelStyle`, `tableHeaderStyle` — **6**, xoá hẳn |

- [ ] **Bước 1: Ghi dấu vân tay** `/customers/55/loans` với form KUNN đang mở, và với tab Lịch trả nợ đang mở (`/customers/55/loans/1135/schedule`).

- [ ] **Bước 2: Gom ba cụm, xoá sáu chuỗi class**

- [ ] **Bước 3: Đếm lại props**

Kỳ vọng: **46 − 10 − 6 − 5 − 6 + 3 = 22**.

Nếu ra số khác, **ghi con số thật vào báo cáo** và giải thích — đừng ép cho khớp.

- [ ] **Bước 4: Quét sạch chuỗi class trong cây KUNN**

```bash
grep -rnE "containerCardBg|sectionBoxBg|inputStyle|readonlyInputStyle|labelStyle|tableHeaderStyle|cardBg" src/components/portfolio
```

Kỳ vọng: không ra dòng nào.

- [ ] **Bước 5: So dấu vân tay, chạy test, đề nghị commit**

Thông điệp gợi ý: `refactor(kunn): KunnForm tu 65 props xuong 22, het chuoi class`.

---

## Task 7: Rút luật nghiệp vụ trong JSX xuống `lib/`

**Tệp:**
- Tạo: `src/lib/kunnFormRules.ts`, `src/lib/__tests__/kunnFormRules.test.ts`
- Sửa: `portfolio/kunn/KunnRepaymentSection.tsx` và bất kỳ chỗ nào Bước 1 tìm ra

Đây là task bản thiết kế §11 đòi: luật nghiệp vụ nằm ở tầng trình bày thì test không với tới được.

**Luật đã biết:** `KunnRepaymentSection.tsx` khoá hai trường bằng `disabled={form.LoanMethod === 'Hạn mức tín dụng'}`. Đó là luật nghiệp vụ ("vay theo hạn mức tuần hoàn thì hai trường này không áp dụng") viết thẳng trong JSX, không có gì ở `lib/` giữ.

- [ ] **Bước 1: Quét đủ luật còn trong JSX**

```bash
grep -rnE "disabled=\{[^}]*(LoanMethod|IsClosed|IsSettled|DebtGroup|Tenor)" src/components/portfolio src/components/collateral src/components/creditContract src/components/customer
```

Liệt kê **đủ** vào báo cáo trước khi sửa. Đây là bản kiểm kê §11 yêu cầu; thiếu một luật là mất một ràng buộc.

- [ ] **Bước 2: Viết test đỏ**

Mỗi luật một hàm thuần trong `kunnFormRules.ts` và một test khẳng định cả hai chiều (áp dụng / không áp dụng). Chạy trước khi có hàm, phải ĐỎ vì chưa có module.

- [ ] **Bước 3: Viết hàm, chạy xanh**

- [ ] **Bước 4: JSX gọi hàm**

`disabled={khongApDungTraGoc(form.LoanMethod)}` thay cho so sánh chuỗi tại chỗ.

- [ ] **Bước 5: Tự phá để kiểm chứng**

Đổi hàm thành `() => false`, chạy lại test — phải ĐỎ. Trích dòng đỏ thật vào báo cáo. Khôi phục.

- [ ] **Bước 6: So dấu vân tay, chạy test, đề nghị commit**

Thông điệp gợi ý: `refactor(kunn): rut luat nghiep vu tu JSX xuong lib de co test giu`.

---

## Task 8: Thay sáu chỗ tự dựng `bg-panel border border-line` bằng `Panel`

**Tệp:** sáu tệp mà lệnh dưới tìm ra.

```bash
grep -rln "bg-panel border border-line" src --include=*.tsx | grep -v __tests__
```

- [ ] **Bước 1: Liệt kê sáu tệp, ghi dấu vân tay màn chứa chúng**

- [ ] **Bước 2: So chuỗi trước khi thay**

`Panel` trong `src/components/ui/Panel.tsx` phải sinh ra **đúng** chuỗi class mà chỗ tự dựng đang có. Nếu khác — ví dụ `Panel` thêm `shadow-sm` mà chỗ kia không có — thì thay vào **sẽ đổi diện mạo**. Trường hợp đó: ghi rõ khác biệt vào báo cáo và **dừng**, để chủ dự án quyết, đừng tự thay.

- [ ] **Bước 3: Thay, so dấu vân tay, chạy test, đề nghị commit**

Thông điệp gợi ý: `refactor(panel): sau cho tu dung khung doi sang component Panel`.

---

## Task 9: Đếm lại, cập nhật tài liệu

**Tệp:** `CONVENTIONS.md` §15, `docs/superpowers/TRANG-THAI.md`

- [ ] **Bước 1: Đo lại toàn bộ con số**

```bash
grep -rlE "containerCardBg|sectionBoxBg|inputStyle|readonlyInputStyle|labelStyle|tableHeaderStyle|cardBg" src --include=*.tsx | wc -l
awk '/^(export )?interface KunnFormProps/,/^}/' src/components/portfolio/KunnForm.tsx | grep -cE '^\s+\w+[?]?:'
rg "AdaptiveTable" src | wc -l
npm test 2>&1 | tail -4
npm run lint 2>&1 | grep -c warning
```

- [ ] **Bước 2: Cập nhật `CONVENTIONS.md` §15**

Sửa hai con số đang ghi trong đó: "69 tệp vẫn truyền chuỗi class" và "`KunnForm` hiện nhận 65 props" — thay bằng số đo được. Phân biệt rõ đâu là **đích** đâu là **hiện trạng**; dự án đã trả giá vì tài liệu lệch khỏi mã bảy chỗ.

Ghi thêm: `DataTable` nay là bảng duy nhất, `AdaptiveTable` đã xoá.

- [ ] **Bước 3: Cập nhật `TRANG-THAI.md`**

Đợt 3 ✅, đợt 4 kế tiếp, số test/lint thật, và **thêm vào "Việc còn treo"**:

- **thang chữ ngữ nghĩa chưa ai tiêu thụ** — mức trung bình. Sáu biến `--fs-*` đợt 0 dựng mới dùng 16 lần toàn dự án, trong khi cây đợt 3 dùng `text-xs` 145 lần. Chuyển sẽ đổi cỡ chữ nên cố ý loại khỏi đợt 3. Kèm bẫy: khối ghi đè `.text-xs` ở `index.css:204` nằm sau `@import "tailwindcss"` nên nó **thắng** mọi lớp `text-[var(--fs-body)]` sinh sau.
- **90 → còn bao nhiêu tệp truyền chuỗi class ngoài cây đợt 3** — số thật đo ở Bước 1.
- **`className` của `DataTable` là props chuỗi class**, vi phạm luật cứng §5 ngay trong component của đợt 2.

- [ ] **Bước 4: Đề nghị commit**

Thông điệp gợi ý: `docs: dot 3 hoan tat — dong bo quy uoc va trang thai`.

---

## Tự rà lại kế hoạch

**Phủ phạm vi đã chốt:**

| Việc | Task |
| :--- | :--- |
| Gỡ chuỗi class khỏi 20 tệp cây đợt 3 | 3, 4, 6 |
| `KunnForm` 65 props → 22 | 5, 6 |
| `AdaptiveTable` → `DataTable`, xoá bản cũ | 2 |
| 6 chỗ tự dựng khung → `Panel` | 8 |
| Rút luật nghiệp vụ xuống `lib/` | 7 |
| Chứng minh không đổi diện mạo | 1, và bước cuối mỗi task |

**Cố ý ngoài phạm vi:**
- Chuyển `text-xs` sang `--fs-*` — đổi cỡ chữ, trái mục tiêu đợt này.
- 70 tệp truyền chuỗi class **ngoài** cây đợt 3 — thuộc đợt 4–7 theo màn.
- Chốt "chưa lưu" khi Back xoá biểu mẫu KUNN đang điền dở — việc còn treo, là hành vi điều hướng chứ không phải nợ cấu trúc.
- Diện mạo năm màn — chủ dự án đã tự dựng, đợt này không đụng.
