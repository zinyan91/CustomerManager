# Bộ biểu mẫu theo Hồ sơ — Plan 3b: Bảng kê mua hàng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thêm giấy "Bảng kê mua hàng" vào bộ Hồ sơ giải ngân, **tái dùng** builder có sẵn `buildPurchaseStatementDocHtml` (khổ ngang A4, style riêng), qua một `DocTemplate` đặc biệt `standalone` hiển thị/in bằng preview riêng thay vì khung dùng chung.

**Architecture:** `bangKeTemplate` map `DossierCommon` (Bên B=người bán, `items`=hàng, Bên A=người mua, `bank`) → `StatementItem[]` + `StatementSellerInfo`, rồi gọi `buildPurchaseStatementDocHtml`. Vì builder trả **tài liệu HTML hoàn chỉnh khổ ngang**, đánh dấu template `standalone: true`; `DossierWorkspace` khi tab active là standalone thì render `StandaloneDocPreview` (iframe srcDoc + Tải Word/In PDF trên chính tài liệu gốc) thay cho `DocumentPreview` dùng chung.

**Tech Stack:** TypeScript, React, vitest.

**Spec:** [docs/superpowers/specs/2026-09-07-bo-bieu-mau-ho-so-design.md](../specs/2026-09-07-bo-bieu-mau-ho-so-design.md)

## Global Constraints

- Không sửa [inventoryExport.ts](../../../src/lib/inventoryExport.ts), [statement.ts](../../../src/lib/statement.ts), [documentHtml.ts](../../../src/lib/documentHtml.ts), 8 mẫu cũ, controller cũ, forms cũ. Chỉ tái dùng qua import.
- Không thêm dependency. Dùng lại `htmlToDocx`/`MIME_DOCX` ([docxWriter](../../../src/lib/docxWriter.ts)), `downloadBytes` ([xlsExport](../../../src/lib/xlsExport.ts)), `printHtmlDoc` ([printHtmlDoc](../../../src/lib/printHtmlDoc.ts)) — đúng các import mà [DocumentPreview.tsx](../../../src/components/documents/DocumentPreview.tsx) đang dùng.
- Sau mỗi task: `npx tsc --noEmit -p tsconfig.json` sạch; test liên quan xanh.

## File Structure

- Sửa: `registry/types.ts` — thêm field optional `standalone?: boolean` vào `DocTemplate`.
- Create: `registry/templates/bangKe.ts` — `BangKeSpecific`, `bangKeTemplate`, `bangKeToStatement`.
- Create: `dossier/StandaloneDocPreview.tsx` — preview iframe + Word/PDF cho tài liệu hoàn chỉnh.
- Sửa: `registry/templates/index.ts` (thêm bang_ke), `registry/dossiers.ts` (thêm bang_ke vào giải ngân), `dossier/specificForms.ts` (bang_ke→null), `dossier/DossierWorkspace.tsx` (dùng StandaloneDocPreview khi `standalone`).
- Tests: `registry/__tests__/bangKe.test.ts`, cập nhật `registry/__tests__/registry.test.ts`.

---

## Task 1: Thêm cờ `standalone` vào `DocTemplate`

**Files:**
- Modify: `src/components/documents/registry/types.ts`

- [ ] **Step 1: Thêm field** — trong interface `DocTemplate<S>`, thêm dòng optional:

```ts
  standalone?: boolean;   // true = buildHtml trả tài liệu HTML hoàn chỉnh (tự style/khổ), preview & in riêng
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit -p tsconfig.json` (không lỗi; field optional nên không phá template cũ).

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/registry/types.ts
git commit -m "feat(docs-registry): cờ standalone cho DocTemplate tài liệu hoàn chỉnh"
```

---

## Task 2: `bang_ke` template + golden test

**Files:**
- Create: `src/components/documents/registry/templates/bangKe.ts`
- Test: `src/components/documents/registry/__tests__/bangKe.test.ts`

**Interfaces:**
- Consumes: `buildPurchaseStatementDocHtml` từ [inventoryExport.ts](../../../src/lib/inventoryExport.ts); `StatementItem`, `StatementSellerInfo` từ [statement.ts](../../../src/lib/statement.ts); `DocTemplate`, `DossierCommon` (types); `ClipboardList` từ `lucide-react`.
- Produces: `BangKeSpecific = Record<string, never>`, `bangKeTemplate` (id `bang_ke`, `standalone: true`), `bangKeToStatement(common): { items: StatementItem[]; info: StatementSellerInfo }`.

Map: `items` ← common.items ({name→itemName, quantity→qty, price→unitPrice, unit, note, dateStr=common.contractDate}); `info` ← seller=partyB, buyer=partyA, bank=common.bank, paymentMethod='transfer'.

- [ ] **Step 1: Write failing test**

```ts
// src/components/documents/registry/__tests__/bangKe.test.ts
import { it, expect } from 'vitest';
import { buildPurchaseStatementDocHtml } from '../../../../lib/inventoryExport';
import type { StatementItem, StatementSellerInfo } from '../../../../lib/statement';
import { emptyCommon } from '../types';
import { bangKeTemplate, bangKeToStatement } from '../templates/bangKe';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-09';
  c.partyA = { name: 'NGÔ NHỊ ĐẠT', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'TRẦN THỊ PHƯƠNG', cccd: '0791 7802 5859', cccdDate: '', cccdPlace: '',
    address: 'Q10, TP.HCM', birthYear: '' };
  c.bank = { owner: 'TRẦN THỊ PHƯƠNG', accNo: '0123456789', name: 'Vietcombank', branch: 'TP.HCM' };
  c.items = [
    { id: '1', name: 'Lúa Jasmine', unit: 'Tấn', quantity: 25, price: 8500000, note: 'vụ ĐX' },
    { id: '2', name: 'Gạo ST25', unit: 'Tấn', quantity: 15, price: 22000000 },
  ];
  return c;
}

it('bangKeToStatement maps common → statement items + seller info', () => {
  const { items, info } = bangKeToStatement(sampleCommon());
  expect(items).toHaveLength(2);
  expect(items[0]).toMatchObject({ itemName: 'Lúa Jasmine', unit: 'Tấn', qty: 25, unitPrice: 8500000 });
  expect(info.sellerName).toBe('TRẦN THỊ PHƯƠNG');
  expect(info.buyerName).toBe('NGÔ NHỊ ĐẠT');
  expect(info.buyerIdCard).toBe('0343 0300 4676');
  expect(info.bankAccNo).toBe('0123456789');
  expect(info.paymentMethod).toBe('transfer');
});

it('is marked standalone and buildHtml equals the reused statement builder (golden)', () => {
  expect(bangKeTemplate.standalone).toBe(true);
  const common = sampleCommon();
  const expectedItems: StatementItem[] = [
    { id: '1', dateStr: '2026-04-09', itemName: 'Lúa Jasmine', unit: 'Tấn', qty: 25, unitPrice: 8500000, note: 'vụ ĐX' },
    { id: '2', dateStr: '2026-04-09', itemName: 'Gạo ST25', unit: 'Tấn', qty: 15, unitPrice: 22000000, note: '' },
  ];
  const expectedInfo: StatementSellerInfo = {
    sellerName: 'TRẦN THỊ PHƯƠNG', sellerAddress: 'Q10, TP.HCM', sellerBankAcc: '',
    sellerIdCard: '0791 7802 5859', buyerName: 'NGÔ NHỊ ĐẠT', buyerIdCard: '0343 0300 4676',
    statementDateStr: '2026-04-09', paymentMethod: 'transfer',
    bankAccNo: '0123456789', bankName: 'Vietcombank', bankOwner: 'TRẦN THỊ PHƯƠNG', bankBranch: 'TP.HCM',
  };
  const expected = buildPurchaseStatementDocHtml(expectedItems, expectedInfo);
  expect(bangKeTemplate.buildHtml(common, {})).toBe(expected);
});
```

- [ ] **Step 2: Run → fail** (`Cannot find module ../templates/bangKe`).

Run: `npx vitest run src/components/documents/registry/__tests__/bangKe.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/components/documents/registry/templates/bangKe.ts
import { ClipboardList } from 'lucide-react';
import { buildPurchaseStatementDocHtml } from '../../../../lib/inventoryExport';
import type { StatementItem, StatementSellerInfo } from '../../../../lib/statement';
import type { DocTemplate, DossierCommon } from '../types';

export type BangKeSpecific = Record<string, never>;

export function bangKeToStatement(common: DossierCommon): { items: StatementItem[]; info: StatementSellerInfo } {
  const items: StatementItem[] = common.items.map(it => ({
    id: it.id,
    dateStr: common.contractDate,
    itemName: it.name,
    unit: it.unit,
    qty: it.quantity,
    unitPrice: it.price,
    note: it.note ?? '',
  }));
  const info: StatementSellerInfo = {
    sellerName: common.partyB.name,
    sellerAddress: common.partyB.address,
    sellerBankAcc: '',
    sellerIdCard: common.partyB.cccd,
    buyerName: common.partyA.name,
    buyerIdCard: common.partyA.cccd,
    statementDateStr: common.contractDate,
    paymentMethod: 'transfer',
    bankAccNo: common.bank.accNo,
    bankName: common.bank.name,
    bankOwner: common.bank.owner,
    bankBranch: common.bank.branch,
  };
  return { items, info };
}

export const bangKeTemplate: DocTemplate<BangKeSpecific> = {
  id: 'bang_ke',
  label: 'Bảng Kê Mua Hàng',
  icon: ClipboardList,
  specificDefaults: {},
  standalone: true,
  buildHtml: (common) => {
    const { items, info } = bangKeToStatement(common);
    return buildPurchaseStatementDocHtml(items, info);
  },
};
```

- [ ] **Step 4: Run → pass; tsc sạch.**
- [ ] **Step 5: Commit**

```bash
git add src/components/documents/registry/templates/bangKe.ts src/components/documents/registry/__tests__/bangKe.test.ts
git commit -m "feat(docs-registry): template Bảng kê mua hàng tái dùng builder có sẵn + golden test"
```

---

## Task 3: `StandaloneDocPreview` (preview + xuất cho tài liệu hoàn chỉnh)

**Files:**
- Create: `src/components/documents/dossier/StandaloneDocPreview.tsx`

**Interfaces:**
- Consumes: `htmlToDocx`, `MIME_DOCX` (docxWriter); `downloadBytes` (xlsExport); `printHtmlDoc` (printHtmlDoc).
- Produces: `StandaloneDocPreview: FC<{ docTitle: string; docFilename: string; docHtml: string }>` — render `docHtml` (tài liệu hoàn chỉnh) trong `<iframe srcDoc>` để cô lập style/khổ; nút Tải Word (`htmlToDocx(docHtml)`) + In/PDF (`printHtmlDoc(docHtml, docFilename)`).

- [ ] **Step 1: Implement**

```tsx
// src/components/documents/dossier/StandaloneDocPreview.tsx
import React from 'react';
import { Download, Printer } from 'lucide-react';
import { htmlToDocx, MIME_DOCX } from '../../../lib/docxWriter';
import { downloadBytes } from '../../../lib/xlsExport';
import { printHtmlDoc } from '../../../lib/printHtmlDoc';

export const StandaloneDocPreview: React.FC<{
  docTitle: string; docFilename: string; docHtml: string;
}> = ({ docTitle, docFilename, docHtml }) => (
  <div className="flex flex-col h-full overflow-hidden font-app">
    <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/50 flex flex-wrap items-center justify-between gap-3">
      <div>
        <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider block mb-0.5">XEM TRƯỚC VĂN BẢN</span>
        <h2 className="font-bold text-sm sm:text-base text-accent tracking-tight">{docTitle}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button"
          onClick={() => downloadBytes(htmlToDocx(docHtml), `${docFilename}.docx`, MIME_DOCX)}
          className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-accent/20 cursor-pointer">
          <Download className="w-4 h-4" /><span>Tải Word (.docx)</span>
        </button>
        <button type="button"
          onClick={() => printHtmlDoc(docHtml, docFilename)}
          className="flex items-center space-x-1.5 bg-neg hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer">
          <Printer className="w-4 h-4" /><span>In / Xuất PDF</span>
        </button>
      </div>
    </div>
    <div className="flex-1 bg-surface/30 p-2">
      <iframe title={docTitle} srcDoc={docHtml}
        className="w-full h-full min-h-[600px] bg-white rounded-lg border border-line/50" />
    </div>
  </div>
);
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit -p tsconfig.json`.
- [ ] **Step 3: Commit**

```bash
git add src/components/documents/dossier/StandaloneDocPreview.tsx
git commit -m "feat(dossier-ui): preview + xuất riêng cho tài liệu hoàn chỉnh (bảng kê)"
```

---

## Task 4: Đăng ký bang_ke + dùng StandaloneDocPreview + test toàn vẹn

**Files:**
- Modify: `registry/templates/index.ts`, `registry/dossiers.ts`, `dossier/specificForms.ts`, `dossier/DossierWorkspace.tsx`
- Test: cập nhật `registry/__tests__/registry.test.ts`

- [ ] **Step 1: Đăng ký**

`registry/templates/index.ts` — thêm `import { bangKeTemplate } from './bangKe';` và `[bangKeTemplate.id]: bangKeTemplate,` vào `TEMPLATE_BY_ID`.

`registry/dossiers.ts` — trong dossier `giai_ngan`, chèn `{ templateId: 'bang_ke' }` **sau** `sale_contract`:
```ts
    documents: [
      { templateId: 'sale_contract' },
      { templateId: 'bang_ke' },
      { templateId: 'payment_request_sale' },
      { templateId: 'cam_ket', optional: true },
    ],
```

`dossier/specificForms.ts` — thêm `bang_ke: null,` vào `SPECIFIC_FORM_BY_ID`.

- [ ] **Step 2: DossierWorkspace dùng StandaloneDocPreview khi standalone**

Trong [DossierWorkspace.tsx](../../../src/components/documents/dossier/DossierWorkspace.tsx), import `StandaloneDocPreview`, và ở cột phải thay khối `<DocumentPreview .../>` bằng nhánh điều kiện:

```tsx
<div className="lg:col-span-6 flex flex-col bg-surface/20 min-h-[700px]">
  {ctrl.activeTemplate.standalone ? (
    <StandaloneDocPreview
      docTitle={ctrl.activeTemplate.label}
      docFilename={ctrl.activeTemplate.id}
      docHtml={ctrl.activeHtml}
    />
  ) : (
    <DocumentPreview
      styles={styles}
      docTitle={ctrl.activeTemplate.label}
      docFilename={ctrl.activeTemplate.id}
      docHtml={ctrl.activeHtml}
    />
  )}
</div>
```

Với template `standalone`, cột trái vẫn hiện `CommonInfoForm` (bảng kê lấy hết từ Thông tin chung; `SPECIFIC_FORM_BY_ID.bang_ke` = null nên không có form phần riêng).

- [ ] **Step 3: Cập nhật test toàn vẹn** — trong `registry.test.ts`, sửa case "Giải ngân" cho khớp 4 tài liệu:

```ts
it('Giải ngân dossier lists its documents in order', () => {
  const giaiNgan = DOSSIERS.find(d => d.id === 'giai_ngan');
  expect(giaiNgan?.documents.map(d => d.templateId)).toEqual([
    'sale_contract', 'bang_ke', 'payment_request_sale', 'cam_ket',
  ]);
  expect(giaiNgan?.documents.find(d => d.templateId === 'cam_ket')?.optional).toBe(true);
});
```

- [ ] **Step 4: Run test + tsc**

Run: `npx vitest run src/components/documents/registry/__tests__/registry.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS; test "every dossier document references an existing template" vẫn xanh.

- [ ] **Step 5: Kiểm thử trên app (parent làm)** — mở bộ Giải ngân → có tab "Bảng Kê Mua Hàng"; điền Thông tin chung (hàng + Bên A/B) → tab Bảng Kê hiện bảng khổ ngang đúng, nút Tải Word/In hoạt động; các tab khác dùng preview thường như cũ.

- [ ] **Step 6: Commit**

```bash
git add src/components/documents/registry/templates/index.ts src/components/documents/registry/dossiers.ts src/components/documents/dossier/specificForms.ts src/components/documents/dossier/DossierWorkspace.tsx src/components/documents/registry/__tests__/registry.test.ts
git commit -m "feat(dossier): thêm Bảng kê vào bộ Giải ngân + preview riêng cho tài liệu hoàn chỉnh"
```

---

## Self-Review

**Spec coverage:** "gộp bảng kê vào bộ Giải ngân" → Task 4; tái dùng feature có sẵn (quyết định của người dùng) → Task 2 gọi `buildPurchaseStatementDocHtml`; golden test độc lập (dựng items/info kỳ vọng bằng tay) → Task 2; preview/in phù hợp tài liệu khổ ngang hoàn chỉnh → Task 3 + Task 4 (nhánh `standalone`).

**Placeholder scan:** không TBD; code thật; golden dựng `StatementItem[]`/`StatementSellerInfo` kỳ vọng bằng tay, giá trị khác rỗng → không tautology.

**Type consistency:** `standalone?` optional thêm ở types.ts, dùng ở bangKe + DossierWorkspace; `bangKeToStatement` trả đúng `StatementItem[]`/`StatementSellerInfo`; id `bang_ke` khớp giữa template/dossier/specificForms/test.

**Rủi ro:** `htmlToDocx(docHtml)` với tài liệu HTML hoàn chỉnh (có `<!DOCTYPE>`) — nếu Word ra lạ, Task 5 sẽ phát hiện; khi đó rút phần `<body>` trước khi `htmlToDocx` (xử lý trong StandaloneDocPreview, không sửa builder). Preview dùng `<iframe srcDoc>` nên style/khổ ngang của bảng kê được cô lập, không đụng CSS dùng chung.

## Execution Handoff

Sau 3b: bộ Giải ngân đủ 4 tờ (HĐ mua bán, Bảng kê, Đề nghị TT, Cam kết). Tiếp Plan 3c: folder "Cho thuê" (Thuê mặt bằng + Thuê nhà ở), thêm Dự toán thi công vào folder Sửa chữa nhà, đưa Đặt cọc vào nhóm "Khác", rồi bỏ chế độ song song.
