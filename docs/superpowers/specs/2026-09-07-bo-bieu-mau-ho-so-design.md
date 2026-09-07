# Thiết kế: Bộ biểu mẫu theo Hồ sơ (Dossier) cho tab Soạn biểu mẫu HĐ

- **Ngày**: 2026-09-07
- **Trạng thái**: Đã duyệt thiết kế (chờ soát spec → lên kế hoạch thực thi)
- **Phạm vi**: Tab "Soạn biểu mẫu HĐ" ([DocumentTemplateView](../../../src/components/views/DocumentTemplateView.tsx))

## 1. Bối cảnh & vấn đề

Bộ soạn thảo hiện có 8 mẫu, chọn qua một dải nút phẳng ([TemplateSelector](../../../src/components/documents/TemplateSelector.tsx)). Sắp tới cần thêm nhiều hợp đồng/giấy tờ ngân hàng, kéo theo hai vấn đề:

1. **Selector hết chỗ**: thêm mẫu thì dải nút phẳng ngày càng chật.
2. **Ráp nối không chịu nổi khi mở rộng**: controller ([useDocumentTemplateController](../../../src/hooks/useDocumentTemplateController.ts)) có ~60 `useState` đặt tên cứng, luồn tay qua 3 lớp (controller → view → form) và gom vào một object phẳng cho `buildDocumentHtml`. Mỗi mẫu mới nhân thêm coupling.

Ngoài ra, thực tế nghiệp vụ là giấy tờ đi theo **bộ hồ sơ** dùng chung dữ liệu (vd hồ sơ giải ngân gồm HĐ mua bán + Đề nghị TT + Cam kết + Bảng kê, cùng hai bên/số tiền/đợt TT).

## 2. Mục tiêu

- Nhóm giấy tờ thành **danh mục hồ sơ** (mỗi danh mục = một bộ nhiều giấy tờ). Chọn qua selector **2 tầng** → giải quyết chuyện hết chỗ.
- **Điền thông tin chung một lần → chảy vào cả bộ**; vẫn xem trước và xuất từng tờ riêng.
- Cấu trúc theo **registry**: thêm danh mục = thêm một cấu hình; thêm giấy tờ = thêm một file descriptor. Không đụng lõi, không luồn prop.
- Chuyển đổi **an toàn, từng bước**: 8 mẫu cũ luôn chạy được trong suốt quá trình; **output Word/PDF không đổi**.

## 3. Ngoài phạm vi (làm sau, không cản thiết kế này)

- Tự điền từ hồ sơ khách hàng/HĐ tín dụng có sẵn trong app.
- Nút "Xuất cả bộ" (batch export toàn danh mục cùng lúc).
- Kho lưu file đã ký (Supabase Storage).
- Refactor toàn bộ 8 mẫu trong một đợt (chọn cách chuyển dần).

## 4. Mô hình dữ liệu

### 4.1 Khối dùng chung — `DossierCommon`

```ts
interface Party {
  name: string; cccd: string; cccdDate: string;
  cccdPlace: string; address: string; birthYear?: string;
}

interface LineItem {           // hàng hóa HOẶC hạng mục — tùy danh mục
  id: string; name: string; unit: string;
  quantity: number; price: number; note?: string;
}

interface DossierCommon {
  partyA: Party;               // vd: khách hàng vay / bên mua
  partyB: Party;               // vd: bên bán / nhà cung cấp
  contractDate: string;
  startDate: string; endDate: string;
  bank: { owner: string; accNo: string; name: string; branch: string };
  totalAmount: string;
  stages: PaymentStageItem[];  // các đợt thanh toán, dùng chung trong bộ
  items: LineItem[];           // MỘT danh sách dùng chung trong bộ
}
```

Chốt: đúng **2 bên** (không cần >2). **Một** danh sách `items` dùng chung mỗi bộ là đủ.

### 4.2 Giấy tờ — `DocTemplate`

```ts
interface DocTemplate<S> {
  id: string;
  label: string;
  icon: LucideIcon;
  specificDefaults: S;                 // dữ liệu riêng mặc định
  SpecificForm?: FC<{ common: DossierCommon; specific: S;
                      patch: (p: Partial<S>) => void }>;
  buildHtml: (common: DossierCommon, specific: S) => string;
  attachments?: (common: DossierCommon, specific: S) => Attachment[];
}
```

`common` và `S` tách bạch: sửa nội bộ một tờ không ảnh hưởng tờ khác; tờ chỉ phụ thuộc interface `DossierCommon`.

### 4.3 Danh mục — `Dossier`

```ts
interface Dossier {
  id: string;
  label: string;
  icon: LucideIcon;
  commonDefaults?: Partial<DossierCommon>;
  documents: Array<{ templateId: string; optional?: boolean }>;  // có thứ tự
}
```

- Thêm danh mục = thêm một object `Dossier` trỏ tới các `DocTemplate` (tái dùng: "Đề nghị TT" nằm trong nhiều bộ nhưng chỉ định nghĩa một lần).
- `optional: true` → giấy tờ "nếu có" (vd Cam kết), bật/tắt được.

## 5. State & luồng dữ liệu

### 5.1 State (thay ~60 biến phẳng)

```ts
{
  activeDossierId: string;
  activeDocId: string;
  common: DossierCommon;                     // khối chung của danh mục hiện tại
  specificByDocId: Record<string, unknown>;  // dữ liệu riêng từng tờ
  excludedDocIds: Set<string>;               // giấy tùy chọn đang tắt
}
```

Logic này tách thành **reducer thuần** để test không cần React.

### 5.2 Luồng

- **Chọn danh mục** → nạp `commonDefaults` vào `common`; `activeDocId` = tờ đầu; khởi tạo `specificByDocId` cho các tờ trong bộ từ `specificDefaults`.
- **Form "Thông tin chung"** sửa `common`.
- **Form phần riêng** sửa `specificByDocId[activeDocId]`.
- **Xem trước / Xuất / In**: `activeTemplate.buildHtml(common, specificByDocId[activeDocId])`; đính kèm qua `attachments?.(...)`.
- **Đổi tờ trong cùng danh mục**: `common` **giữ nguyên** (cốt lõi "điền một lần, chảy cả bộ").
- **Đổi danh mục**: `common` **nạp lại** theo defaults danh mục mới (có nhắc nhẹ nếu đang có dữ liệu chưa lưu).
- **Bật/tắt giấy tùy chọn**: cập nhật `excludedDocIds`; tờ bị tắt bỏ qua khi xem trước/xuất.

## 6. Giao diện

Bố cục (giữ fix cột form ôm nội dung + bỏ chặn chiều cao đã làm trước đó):

```
┌───────────────────────────────────────────────────────────────┐
│ DANH MỤC HỒ SƠ                                          (tầng 1)│
│ [📁 Giải ngân] [🔧 Sửa chữa nhà] [🏠 Cho thuê] [📄 Khác]        │
├───────────────────────────────────────────────────────────────┤
│ Giấy tờ trong bộ:                                       (tầng 2)│
│ [HĐ Mua bán] [Đề nghị TT] [☑ Cam kết] [Bảng kê mua hàng]       │
├──────────────────────────────┬────────────────────────────────┤
│  ▣ THÔNG TIN CHUNG (cả hồ sơ)│   XEM TRƯỚC: HĐ Mua bán         │
│    Bên A · Bên B · ngày ·    │   [Tải Word] [In / PDF]        │
│    số tiền · ngân hàng ·     │   ┌────────────────────────┐   │
│    đợt TT · danh sách hàng   │   │     (A4 preview)        │   │
│  ────────────────────────────│   │                        │   │
│  ▤ PHẦN RIÊNG: HĐ Mua bán    │   └────────────────────────┘   │
└──────────────────────────────┴────────────────────────────────┘
```

- **Tầng 1** — danh mục hồ sơ (hàng nút, ít nên không chật), style như nút hiện tại.
- **Tầng 2** — giấy tờ của danh mục đang chọn (tab phụ, style nhẹ hơn tầng 1). Chính cơ chế 2 tầng giải quyết "hết chỗ": mỗi lúc chỉ thấy vài tờ của một bộ.
- **Cột trái**: khối "Thông tin chung" (**thu gọn được, mặc định mở**) ở trên; form phần riêng của tờ đang mở ở dưới.
- **Cột phải**: xem trước tờ đang chọn + Tải Word / In PDF + giấy đính kèm (cơ chế cũ), thêm breadcrumb "Danh mục › Tờ".
- **Giấy "nếu có"**: tab tầng 2 có **ô tích ☑** bật/tắt; tắt thì làm mờ và bỏ qua khi xem trước/xuất.

## 7. Migration (chuyển dần, an toàn)

Nguyên tắc: **tái dùng toàn bộ code sinh HTML đang chạy đúng, không viết lại** — qua adapter mỏng.

### 7.1 Adapter `buildHtml`

Giữ nguyên [documentHtml.ts](../../../src/lib/documentHtml.ts) và `buildDocumentHtml(id, params)`. Mỗi `DocTemplate`:

```ts
buildHtml: (common, specific) =>
  buildDocumentHtml('sale_contract', toLegacyParams(common, specific))
```

`toLegacyParams` (hàm thuần) gom common + specific → object phẳng builder cũ đang nhận → HTML y hệt.

### 7.2 "Bọc" mẫu cũ để không mẫu nào chết

Giai đoạn đầu, mỗi mẫu trong 8 mẫu thành **entry đơn lẻ**: toàn bộ field nằm trong `specific`, `common` bỏ trống, `SpecificForm` = component form cũ ([SaleForm](../../../src/components/documents/forms/SaleForm.tsx), [LeaseForm](../../../src/components/documents/forms/LeaseForm.tsx)…) qua adapter props. Chạy nguyên như hiện tại, chưa hưởng "điền chung" nhưng không gãy.

### 7.3 Thứ tự (có điểm dừng kiểm tra)

1. **Dựng khung**: registry + state/reducer mới + khối "Thông tin chung" + selector 2 tầng. Cắm 8 mẫu dạng entry đơn lẻ, gom tạm ở danh mục **"Khác"**. → app chạy y cũ, chỉ đổi vỏ.
2. **Bộ thí điểm "Hồ sơ giải ngân"**: tách chuẩn common/specific cho HĐ Mua bán + Đề nghị TT + Cam kết + Bảng kê mua hàng.
3. **Đối chiếu**: golden test + kiểm tay xuất Word/PDF khớp bản cũ.
4. **Chuyển dần** các danh mục còn lại (sửa nhà, cho thuê…): mỗi mẫu tách field chung ra `DossierCommon`, gỡ lớp bọc tạm.

### 7.4 Thay `DocumentForm` (switch)

Vùng form = khối "Thông tin chung" + `activeTemplate.SpecificForm` (dispatch theo registry). Mẫu chưa migrate dùng form cũ qua adapter.

## 8. Kiểm thử (vitest)

1. **Golden test HTML** (lưới an toàn chính): chụp `buildDocumentHtml(id, paramsCũ)` cho dữ liệu mẫu làm chuẩn vàng; khẳng định `docTemplate.buildHtml(common, specific)` ra HTML y hệt. Dựng ngay khi bắt đầu migrate mỗi mẫu.
2. **Test `toLegacyParams`**: hàm thuần — hai bên vào đúng vai, `items`/`stages` đổ đúng chỗ. Bảng ca kiểm mỗi mẫu.
3. **Test toàn vẹn registry**: mọi `Dossier.documents` trỏ tới `DocTemplate` có thật; không trùng id; đủ field bắt buộc.
4. **Test reducer thuần**: chọn danh mục → nạp common + khởi tạo specific; đổi tờ → giữ common; đổi danh mục → nạp lại common; bật/tắt giấy tùy chọn.
5. **Kiểm thử app thật**: mỗi điểm dừng chạy dev server, thao tác thật + chụp bằng chứng.

TDD: phần thuần (adapter, reducer, registry) viết test trước.

## 9. Cấu trúc file (dự kiến)

```
src/components/documents/
  registry/
    types.ts            // Party, LineItem, DossierCommon, DocTemplate, Dossier, Attachment
    dossiers.ts         // mảng Dossier
    templates/
      index.ts          // gom & export map templateId → DocTemplate
      saleContract.ts   // + toLegacyParams riêng
      paymentRequest.ts
      ...               // mỗi giấy tờ một file
  CommonInfoForm.tsx    // form "Thông tin chung"
  DossierSelector.tsx   // selector 2 tầng (thay TemplateSelector)
src/hooks/
  useDocumentDossierController.ts  // state + reducer thuần
```

`documentHtml.ts` và các form cũ trong `forms/` **giữ nguyên**, được adapter tái dùng.

## 10. Rủi ro & giảm thiểu

- **Lệch output khi migrate** → golden test bắt buộc trước khi đổi mỗi mẫu.
- **Dữ liệu chung khác vai giữa các tờ** → mỗi tờ tự map trong `toLegacyParams`, có test bảng ca.
- **Mất công gõ khi đổi danh mục** → nhắc nhẹ trước khi nạp lại `common`.
