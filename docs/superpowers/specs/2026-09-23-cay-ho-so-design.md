# Cây hồ sơ kiểu Drive cho màn Soạn hồ sơ

Ngày: 2026-09-23 · Trạng thái: đã duyệt

## Brief

**Mục tiêu:** Ở màn Soạn hồ sơ (`/hub/documents`), người dùng chọn bộ hồ sơ và biểu mẫu bằng một cây thư mục bên trái, kiểu Google Drive. Cây ẩn/hiện được, và trình duyệt nhớ trạng thái này. Chuyển qua lại giữa các bộ không làm mất dữ liệu đang nhập.

**Phạm vi:**

- LÀM:
  - Cây hồ sơ cho màn Soạn hồ sơ.
  - Khung cây dùng chung (`TreeRail`).
  - Mỗi bộ hồ sơ giữ dữ liệu riêng trong lúc màn hình còn mở.
  - Nhớ trạng thái ẩn/hiện của cây.
  - Ngăn kéo cho màn hình hẹp.
- KHÔNG LÀM:
  - Sidebar chính của CRM.
  - Đưa sidebar vào các màn `/hub/*`.
  - Cây cho Trung tâm báo cáo, cây khách hàng.
  - Lưu dữ liệu hồ sơ qua lần tải lại trang (tải lại vẫn mất, như hiện nay).
  - Kết nối Google Drive thật.

**Tầng:**

| Tầng | Nội dung |
| :--- | :--- |
| lib | Kiểu nút cây, các hàm cây thuần, dựng cây từ `DOSSIERS` |
| hooks | Reducer và controller hồ sơ, `usePersistedFlag` |
| components | `TreeRail`, `DossierTreeRail`, `DocumentTemplateView`, `DossierWorkspace` |

**Kiểm chứng:**

- Vitest cho reducer, bộ dựng cây, `TreeRail`, `usePersistedFlag` và màn Soạn hồ sơ.
- `npm test`, `npm run build`.
- Chụp màn thật bằng Edge chạy ẩn, ở màn rộng (cây hiện và cây ẩn) và màn hẹp.

**Rủi ro đã biết:**

- Biểu mẫu `cam_ket` có mặt ở hai bộ (`giai_ngan`, `sua_chua_nha`). Nút cây phải định danh theo `bộ/biểu mẫu`, và trạng thái "gồm / không gồm" phải tách riêng theo từng bộ.
- Khoảng 20 chỗ đang đọc `ctrl.state.*`. Controller phải giữ nguyên hình dạng `state` là dữ liệu của bộ đang mở.
- `localStorage` có thể ném lỗi (chế độ riêng tư). Khi đó phải chạy tiếp như bình thường, chỉ là không nhớ trạng thái.

## Bố cục và hành vi

```
← CRM | Hub | Soạn hồ sơ                              [tìm…]
┌──────────────────────┬──────────────────────────────────────┐
│ BỘ HỒ SƠ          «  │ »  ‹  BM01 Giấy đề nghị giải ngân · 1/5 › │
│ ▸ Hồ sơ giải ngân    ├──────────────────┬───────────────────┤
│ ▾ Vận hành tập trung │ Form             │ Xem trước A4      │
│  ┃BM01 Đề nghị GN    │                  │                   │
│   BM02 Tờ trình      │                  │                   │
│ ▸ Khác               │                  │                   │
└──────────────────────┴──────────────────┴───────────────────┘
```

**Cây**

- Cây rộng 240px, chỉ hiện từ `lg` (≥1024px) trở lên.
- Mỗi thư mục là một bộ hồ sơ, dùng biểu tượng của bộ trong `DOSSIERS`. Bấm vào dòng thư mục để mở/đóng; mở được nhiều thư mục cùng lúc.
- Thư mục chứa nút đang chọn luôn được mở sẵn.
- Nút đang chọn đánh dấu bằng thanh màu bên trái (`border-l-2`) và nền `panel-muted`, không lồng khung viền (theo quy ước bỏ lồng khung của thanh trái).
- Giấy tờ tùy chọn có ô tick "gồm" ở bên phải. Khi bỏ tick, nút mờ đi, gạch ngang và không bấm được.
- Bấm một biểu mẫu thuộc bộ khác thì chuyển sang bộ đó. Dữ liệu của từng bộ giữ nguyên.

**Thu gọn**

- Nút « ở đầu cây ẩn hẳn cây. Khi đó nút » xuất hiện ở đầu thanh tiêu đề biểu mẫu để mở lại.
- Trạng thái ẩn/hiện lưu ở `localStorage`, khóa `cm_doc_tree_collapsed`.
- Không có chế độ thu gọn còn lại cột biểu tượng.

**Màn hẹp (<1024px)**

- Cây mặc định ẩn. Bấm » để mở cây thành ngăn kéo trượt đè lên nội dung, có lớp nền mờ phía sau.
- Chọn một biểu mẫu, bấm lớp nền hoặc nhấn Esc đều đóng ngăn kéo.

**Thanh tiêu đề biểu mẫu**

- Giữ: nút ‹ ›, tên biểu mẫu đang mở, vị trí dạng "i/n".
- Bỏ: hàng tab cuộn ngang, popover "Danh mục", ô "Bao gồm".
- Hàng nút 6 bộ hồ sơ ở đầu màn cũng bỏ; tiêu đề màn vẫn giữ.

## Dữ liệu

```ts
interface DossierWorkspaceState {
  activeDossierId: string;
  byDossier: Record<string, DossierState>;
}
```

**Reducer**

- `DossierState` giữ nguyên, là dữ liệu của một bộ.
- Bộ nào chưa có trong `byDossier` thì tạo bằng `initDossierState` vào lần đầu cần tới.

**Thao tác**

| Thao tác | Tác dụng |
| :--- | :--- |
| `selectDossier(dossierId)` | Chỉ đổi `activeDossierId`, không tạo lại bộ đã có. |
| `selectDocIn(dossierId, docId)` | Đổi bộ và đặt `activeDocId` của bộ đó. |
| `toggleOptionalIn(dossierId, docId)` | Chạy logic `toggleOptional` trên bộ chỉ định. |
| `selectDoc`, `patchCommon`, `patchSpecific`, `toggleOptional` | Áp lên bộ đang mở. |

**Controller**

- Trả `state` là `byDossier[activeDossierId]`, giữ đúng hình dạng cũ cho các chỗ đang đọc.
- Thêm `isExcludedIn(dossierId, docId)`, `selectDocIn` và `toggleOptionalIn`.

## Đơn vị mã

| Tệp | Việc |
| :--- | :--- |
| `src/lib/tree/treeNodes.ts` | `TreeNode { id, label, icon?, children?, optional?, disabled? }`; `pathTo(nodes, id)` trả danh sách id tổ tiên. |
| `src/lib/documents/dossierTree.ts` | `buildDossierTree(dossiers, labelOf, isExcludedIn)` → `TreeNode[]`. Id lá là `bộ/biểu mẫu`. `nodeIdOf` và `parseNodeId` dùng để đổi qua lại. |
| `src/hooks/usePersistedFlag.ts` | `[value, setValue]` đọc/ghi `localStorage`, mọi thao tác bọc `try/catch`. |
| `src/components/common/TreeRail.tsx` | Khung cây trình bày thuần. Props: `title`, `nodes`, `selectedId`, `onSelect`, `onCollapse`, `renderTrailing?`. Tự quản lý tập thư mục đang mở; thư mục chứa `selectedId` luôn mở. |
| `src/components/documents/dossier/DossierTreeRail.tsx` | Nối `TreeRail` với controller hồ sơ và thêm ô tick "gồm". |
| `DocumentTemplateView.tsx` | Bố cục cây + workspace, ngăn kéo cho màn hẹp. |
| `DossierWorkspace.tsx` | Rút gọn thanh tiêu đề; nhận prop `onOpenTree` để hiện nút ». |

## Kiểm thử

**Reducer**

- Nhập `common` ở `giai_ngan`, chuyển sang `van_hanh_tap_trung` rồi quay lại: dữ liệu vẫn còn.
- `cam_ket` ở `giai_ngan` và `sua_chua_nha` bật/tắt độc lập với nhau.
- `selectDocIn` chuyển sang bộ khác và chọn đúng biểu mẫu.
- `toggleOptionalIn` trên bộ chưa từng mở: bộ được tạo và biểu mẫu bị loại.

**dossierTree**

- Có đủ 6 thư mục, số lá khớp với `DOSSIERS`.
- Id lá là `bộ/biểu mẫu` và `parseNodeId` đổi ngược về đúng cặp đó.
- Lá tùy chọn được đánh dấu `optional`.

**pathTo:** trả đúng tổ tiên của một lá.

**TreeRail**

- Thư mục chứa nút đang chọn được mở sẵn.
- Bấm vào thư mục thì mở/đóng thư mục đó.
- Bấm vào lá thì gọi `onSelect` với id của lá.
- Nút « gọi `onCollapse`.
- `renderTrailing` hiện ra cạnh lá.

**usePersistedFlag**

- Đọc giá trị ban đầu từ `localStorage`.
- Ghi lại mỗi khi giá trị đổi.
- Khi `localStorage` ném lỗi thì vẫn trả giá trị mặc định, không crash.

**Màn Soạn hồ sơ**

- Không còn hàng nút bộ hồ sơ và hàng tab.
- Bấm "BM02" trên cây thì tiêu đề đổi theo.
- Nút « ẩn cây, nút » mở lại cây.
