# Bộ biểu mẫu theo Hồ sơ — Plan 2: UI (bộ "Giải ngân" chạy thật) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa hệ "hồ sơ nhiều giấy tờ" (Plan 1) lên giao diện: một bộ "Hồ sơ giải ngân" chọn được trong tab Soạn biểu mẫu HĐ, điền "thông tin chung" một lần, chuyển giữa các tờ (HĐ Mua bán / Đề nghị TT / Cam kết), xem trước & xuất Word/PDF từng tờ — **thêm song song, không đụng 8 mẫu cũ**.

**Architecture:** Thêm một controller hook bọc reducer thuần (Plan 1), một form "Thông tin chung" sửa `DossierCommon`, các form phần riêng nhỏ cho từng tờ, và một `DossierWorkspace` ráp selector tầng-2 + form + `DocumentPreview`. Trong [DocumentTemplateView](../../../src/components/views/DocumentTemplateView.tsx) thêm một mục "📁 Hồ sơ giải ngân" vào selector hiện có; chọn nó thì render `DossierWorkspace`, chọn mẫu cũ thì giữ nguyên đường cũ.

**Tech Stack:** React + TypeScript, vitest + @testing-library/react, Tailwind (class tiện ích qua `UI`/`styles`).

**Spec:** [docs/superpowers/specs/2026-09-07-bo-bieu-mau-ho-so-design.md](../specs/2026-09-07-bo-bieu-mau-ho-so-design.md) (§5 state, §6 giao diện)

## Global Constraints

- **Không sửa 8 mẫu cũ**: [useDocumentTemplateController](../../../src/hooks/useDocumentTemplateController.ts), [TemplateSelector](../../../src/components/documents/TemplateSelector.tsx) list 8 mẫu, [DocumentForm](../../../src/components/documents/DocumentForm.tsx), `forms/*` — giữ nguyên đường chạy cũ. Chỉ **thêm** nhánh mới.
- Không sửa [documentHtml.ts](../../../src/lib/documentHtml.ts). Tái dùng qua registry Plan 1.
- Không thêm dependency mới. Dùng lại `DateInput`, `formatMoneyInput`/`parseMoneyInput` từ [src/lib/utils](../../../src/lib/utils.ts), `DocumentPreview` từ [DocumentPreview.tsx](../../../src/components/documents/DocumentPreview.tsx).
- Sau mỗi task: `npx tsc --noEmit -p tsconfig.json` sạch; test liên quan xanh.
- Tên code tiếng Anh, chuỗi hiển thị tiếng Việt.
- Class input dùng lại pattern hiện có: `w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent` + `styles.inputStyle` (xem [Tool1LoanScheduleCalc.tsx:338](../../../src/components/calculator/Tool1LoanScheduleCalc.tsx)).

## File Structure

- `src/hooks/useDocumentDossierController.ts` — `useReducer(dossierReducer)` + tiện ích dẫn xuất (active template, HTML, danh sách tờ đang bật).
- `src/components/documents/dossier/CommonInfoForm.tsx` — form `DossierCommon` (2 bên, ngày, ngân hàng, tổng tiền, đợt TT, danh sách hàng).
- `src/components/documents/dossier/SaleSpecificForm.tsx` — form riêng `SaleSpecific`.
- `src/components/documents/dossier/PaymentSpecificForm.tsx` — form riêng `PaymentSpecific`.
- `src/components/documents/dossier/specificForms.ts` — map `templateId → SpecificForm component | null`.
- `src/components/documents/dossier/DossierWorkspace.tsx` — selector tầng 2 + form + preview.
- Sửa: `src/components/views/DocumentTemplateView.tsx` — thêm nhánh render dossier.
- Tests: `src/hooks/__tests__/useDocumentDossierController.test.tsx`, `src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx`.

Mỗi `SpecificForm` nhận props `{ common: DossierCommon; specific: S; patch: (p: Partial<S>) => void }` (khớp `DocTemplate.SpecificForm` ở Plan 1).

---

## Task 1: Controller hook `useDocumentDossierController`

**Files:**
- Create: `src/hooks/useDocumentDossierController.ts`
- Test: `src/hooks/__tests__/useDocumentDossierController.test.tsx`

**Interfaces:**
- Consumes: `dossierReducer`, `initDossierState`, `DossierState` từ [documentDossierReducer](../../../src/hooks/documentDossierReducer.ts); `TEMPLATE_BY_ID` từ `../components/documents/registry/templates`; `DOSSIERS` từ `../components/documents/registry/dossiers`.
- Produces `useDocumentDossierController()` trả về:
  - `state: DossierState`
  - `dossiers = DOSSIERS`
  - `activeDossier: Dossier`
  - `visibleDocs: Array<{ templateId: string; optional?: boolean }>` — tài liệu của dossier (kể cả bị tắt, để render tab)
  - `activeTemplate: DocTemplate<any>`
  - `activeSpecific: unknown`
  - `activeHtml: string` — `activeTemplate.buildHtml(state.common, activeSpecific)`
  - `isExcluded(docId): boolean`
  - actions: `selectDossier`, `selectDoc`, `patchCommon`, `patchSpecific(docId, patch)`, `toggleOptional`

- [ ] **Step 1: Write the failing test**

```tsx
// src/hooks/__tests__/useDocumentDossierController.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentDossierController } from '../useDocumentDossierController';

describe('useDocumentDossierController', () => {
  it('starts on the first dossier with the first doc active and builds HTML', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    expect(result.current.activeDossier.id).toBe('giai_ngan');
    expect(result.current.state.activeDocId).toBe('sale_contract');
    expect(typeof result.current.activeHtml).toBe('string');
    expect(result.current.activeHtml.length).toBeGreaterThan(0);
  });

  it('patchCommon flows into the active document HTML', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    act(() => result.current.patchCommon({
      partyA: { ...result.current.state.common.partyA, name: 'NGUYỄN VĂN TEST' },
    }));
    expect(result.current.activeHtml).toContain('NGUYỄN VĂN TEST');
  });

  it('toggleOptional marks cam_ket excluded', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    act(() => result.current.toggleOptional('cam_ket'));
    expect(result.current.isExcluded('cam_ket')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useDocumentDossierController.test.tsx`
Expected: FAIL — Cannot find module `../useDocumentDossierController`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/hooks/useDocumentDossierController.ts
import { useReducer, useMemo, useCallback } from 'react';
import type { DossierCommon } from '../components/documents/registry/types';
import type { DocTemplate, Dossier } from '../components/documents/registry/types';
import { TEMPLATE_BY_ID } from '../components/documents/registry/templates';
import { DOSSIERS } from '../components/documents/registry/dossiers';
import { dossierReducer, initDossierState } from './documentDossierReducer';

export function useDocumentDossierController() {
  const [state, dispatch] = useReducer(dossierReducer, DOSSIERS[0].id, initDossierState);

  const activeDossier = useMemo<Dossier>(
    () => DOSSIERS.find(d => d.id === state.activeDossierId) ?? DOSSIERS[0],
    [state.activeDossierId],
  );
  const activeTemplate = TEMPLATE_BY_ID[state.activeDocId] as DocTemplate<any>;
  const activeSpecific = state.specificByDocId[state.activeDocId];
  const activeHtml = useMemo(
    () => activeTemplate.buildHtml(state.common, activeSpecific),
    [activeTemplate, state.common, activeSpecific],
  );

  const isExcluded = useCallback(
    (docId: string) => state.excludedDocIds.includes(docId),
    [state.excludedDocIds],
  );

  return {
    state,
    dossiers: DOSSIERS,
    activeDossier,
    visibleDocs: activeDossier.documents,
    activeTemplate,
    activeSpecific,
    activeHtml,
    isExcluded,
    selectDossier: (dossierId: string) => dispatch({ type: 'selectDossier', dossierId }),
    selectDoc: (docId: string) => dispatch({ type: 'selectDoc', docId }),
    patchCommon: (patch: Partial<DossierCommon>) => dispatch({ type: 'patchCommon', patch }),
    patchSpecific: (docId: string, patch: Record<string, unknown>) =>
      dispatch({ type: 'patchSpecific', docId, patch }),
    toggleOptional: (docId: string) => dispatch({ type: 'toggleOptional', docId }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useDocumentDossierController.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit -p tsconfig.json`

```bash
git add src/hooks/useDocumentDossierController.ts src/hooks/__tests__/useDocumentDossierController.test.tsx
git commit -m "feat(dossier-ui): controller hook bọc reducer + dẫn xuất HTML"
```

---

## Task 2: `CommonInfoForm`

**Files:**
- Create: `src/components/documents/dossier/CommonInfoForm.tsx`
- (Không unit test riêng — kiểm qua `DossierWorkspace` test Task 5 và kiểm tay trên app.)

**Interfaces:**
- Consumes: `DossierCommon`, `LineItem` từ registry types; `DateInput`; `formatMoneyInput` từ utils; `PaymentStageItem` từ `../DocumentForm`.
- Produces: `CommonInfoForm: FC<{ common: DossierCommon; patch: (p: Partial<DossierCommon>) => void }>`.

Form gồm, theo thứ tự (dùng lại pattern input/label ở [SaleForm.tsx](../../../src/components/documents/forms/SaleForm.tsx)):
- **Bên A** và **Bên B**: `name, cccd, cccdDate, cccdPlace, address` (mỗi field một input; `cccdDate` có thể để text như mẫu cũ).
- **Ngày**: `contractDate`, `startDate`, `endDate` qua `DateInput`.
- **Ngân hàng**: `bank.owner, bank.accNo, bank.name, bank.branch`.
- **Tổng tiền**: `totalAmount` (dùng `formatMoneyInput`).
- **Đợt thanh toán** (`stages`): danh sách sửa được (thêm/xoá/sửa `stageName`, `amount` (money), `status`), theo pattern `payStages` trong [DocumentForm.tsx](../../../src/components/documents/DocumentForm.tsx).
- **Danh sách hàng/hạng mục** (`items`): danh sách sửa được (`name, unit, quantity, price`), theo pattern `saleItems`.

Cập nhật con của object lồng nhau bằng cách patch cả object, ví dụ đổi tên Bên A:

```tsx
const setPartyA = (p: Partial<DossierCommon['partyA']>) =>
  patch({ partyA: { ...common.partyA, ...p } });
```

Danh sách cập nhật bất biến:

```tsx
const setStage = (id: string, p: Partial<PaymentStageItem>) =>
  patch({ stages: common.stages.map(s => (s.id === id ? { ...s, ...p } : s)) });
const addStage = () =>
  patch({ stages: [...common.stages, { id: Date.now().toString(),
    stageName: `Đợt ${common.stages.length + 1}`, amount: '0', status: 'future', note: '' }] });
const removeStage = (id: string) =>
  patch({ stages: common.stages.filter(s => s.id !== id) });
```

(Danh sách `items` làm tương tự với `LineItem`.)

- [ ] **Step 1: Viết component** — JSX theo mô tả trên, khối tiêu đề "THÔNG TIN CHUNG (CẢ HỒ SƠ)", các nhóm con phân tách bằng thanh trái/đường kẻ (theo quy ước de-nesting của repo: 1 lớp card ngoài, nhóm con dùng thanh màu trái/đường kẻ — không viền lồng). Bọc toàn khối trong `<details open>` để **thu gọn được, mặc định mở**.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/dossier/CommonInfoForm.tsx
git commit -m "feat(dossier-ui): form Thông tin chung của hồ sơ (thu gọn được)"
```

---

## Task 3: Form phần riêng cho từng tờ + map

**Files:**
- Create: `src/components/documents/dossier/SaleSpecificForm.tsx`
- Create: `src/components/documents/dossier/PaymentSpecificForm.tsx`
- Create: `src/components/documents/dossier/specificForms.ts`
- Test: `src/components/documents/dossier/__tests__/specificForms.test.ts`

**Interfaces:**
- Consumes: `SaleSpecific` từ `../registry/templates/saleContract`; `PaymentSpecific` từ `../registry/templates/paymentRequestSale`.
- Produces:
  - `SaleSpecificForm: FC<{ common; specific: SaleSpecific; patch: (p: Partial<SaleSpecific>) => void }>`
  - `PaymentSpecificForm: FC<{ common; specific: PaymentSpecific; patch: (p: Partial<PaymentSpecific>) => void }>`
  - `SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null>` — `sale_contract`→SaleSpecificForm, `payment_request_sale`→PaymentSpecificForm, `cam_ket`→null.

`SaleSpecificForm`: chọn `payMethod` (cash/transfer, `<select>`), nhập `paymentStage1` (money).
`PaymentSpecificForm`: chọn `payMethodType` (cash/transfer), `recipientTitle` (Ông/Bà); nếu `payMethodType==='cash'` hiện `cashName, cashCccd, cashCccdDate, cashCccdPlace`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/documents/dossier/__tests__/specificForms.test.ts
import { describe, it, expect } from 'vitest';
import { SPECIFIC_FORM_BY_ID } from '../specificForms';

it('maps templates to their specific forms; cam_ket has none', () => {
  expect(SPECIFIC_FORM_BY_ID.sale_contract).toBeTypeOf('function');
  expect(SPECIFIC_FORM_BY_ID.payment_request_sale).toBeTypeOf('function');
  expect(SPECIFIC_FORM_BY_ID.cam_ket).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/dossier/__tests__/specificForms.test.ts`
Expected: FAIL — Cannot find module `../specificForms`.

- [ ] **Step 3: Write implementations**

`SaleSpecificForm.tsx`:

```tsx
import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { SaleSpecific } from '../registry/templates/saleContract';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const SaleSpecificForm: React.FC<{
  common: DossierCommon; specific: SaleSpecific; patch: (p: Partial<SaleSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Phương thức thanh toán</label>
      <select className={INPUT} value={specific.payMethod}
        onChange={e => patch({ payMethod: e.target.value as 'cash' | 'transfer' })}>
        <option value="cash">Tiền mặt</option>
        <option value="transfer">Chuyển khoản</option>
      </select>
    </div>
    <div>
      <label className={LABEL}>Thanh toán đợt 1 (VNĐ)</label>
      <input className={INPUT} value={specific.paymentStage1}
        onChange={e => patch({ paymentStage1: formatMoneyInput(e.target.value) })} />
    </div>
  </div>
);
```

`PaymentSpecificForm.tsx`:

```tsx
import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { PaymentSpecific } from '../registry/templates/paymentRequestSale';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const PaymentSpecificForm: React.FC<{
  common: DossierCommon; specific: PaymentSpecific; patch: (p: Partial<PaymentSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={LABEL}>Hình thức</label>
        <select className={INPUT} value={specific.payMethodType}
          onChange={e => patch({ payMethodType: e.target.value as 'cash' | 'transfer' })}>
          <option value="transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </div>
      <div>
        <label className={LABEL}>Xưng hô người nhận</label>
        <select className={INPUT} value={specific.recipientTitle}
          onChange={e => patch({ recipientTitle: e.target.value as 'Ông' | 'Bà' })}>
          <option value="Ông">Ông</option>
          <option value="Bà">Bà</option>
        </select>
      </div>
    </div>
    {specific.payMethodType === 'cash' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Họ tên (nhận tiền mặt)</label>
          <input className={INPUT} value={specific.cashName}
            onChange={e => patch({ cashName: e.target.value })} /></div>
        <div><label className={LABEL}>CCCD</label>
          <input className={INPUT} value={specific.cashCccd}
            onChange={e => patch({ cashCccd: e.target.value })} /></div>
        <div><label className={LABEL}>Ngày cấp</label>
          <input className={INPUT} value={specific.cashCccdDate}
            onChange={e => patch({ cashCccdDate: e.target.value })} /></div>
        <div><label className={LABEL}>Nơi cấp</label>
          <input className={INPUT} value={specific.cashCccdPlace}
            onChange={e => patch({ cashCccdPlace: e.target.value })} /></div>
      </div>
    )}
  </div>
);
```

`specificForms.ts`:

```ts
import type { FC } from 'react';
import { SaleSpecificForm } from './SaleSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';

export const SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null> = {
  sale_contract: SaleSpecificForm,
  payment_request_sale: PaymentSpecificForm,
  cam_ket: null,
};
```

- [ ] **Step 4: Run test + type-check**

Run: `npx vitest run src/components/documents/dossier/__tests__/specificForms.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (1 test), tsc no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/dossier/SaleSpecificForm.tsx src/components/documents/dossier/PaymentSpecificForm.tsx src/components/documents/dossier/specificForms.ts src/components/documents/dossier/__tests__/specificForms.test.ts
git commit -m "feat(dossier-ui): form phần riêng cho HĐ mua bán & Đề nghị TT"
```

---

## Task 4: `DossierWorkspace` (selector tầng 2 + form + preview)

**Files:**
- Create: `src/components/documents/dossier/DossierWorkspace.tsx`
- Test: `src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx`

**Interfaces:**
- Consumes: `useDocumentDossierController` (Task 1); `CommonInfoForm` (Task 2); `SPECIFIC_FORM_BY_ID` (Task 3); `TEMPLATE_BY_ID` (Plan 1); `DocumentPreview` (existing); `UiClasses`.
- Produces: `DossierWorkspace: FC<{ styles: UiClasses; ctrl: ReturnType<typeof useDocumentDossierController> }>`.

Bố cục: hàng tab tầng 2 (mỗi tờ một nút; tờ `optional` kèm ô tích ☑ bật/tắt qua `toggleOptional`; tờ bị tắt làm mờ và không cho chọn) → lưới 2 cột: trái = `CommonInfoForm` + form phần riêng của tờ đang mở (nếu có), phải = `DocumentPreview` với `docHtml=ctrl.activeHtml`, `docTitle=ctrl.activeTemplate.label`, `docFilename=ctrl.activeTemplate.id`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { UI } from '../../../../lib/uiClasses';
import { useDocumentDossierController } from '../../../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../DossierWorkspace';

function Harness() {
  const ctrl = useDocumentDossierController();
  return <DossierWorkspace styles={UI} ctrl={ctrl} />;
}

it('shows tabs for each document in the dossier', () => {
  render(<Harness />);
  expect(screen.getByText('HĐ Mua Bán Hàng Hóa')).toBeInTheDocument();
  expect(screen.getByText('Đề Nghị TT (Mua Bán)')).toBeInTheDocument();
  expect(screen.getByText('Giấy Cam Kết')).toBeInTheDocument();
});

it('switching to Đề nghị TT changes the preview title', () => {
  render(<Harness />);
  fireEvent.click(screen.getByText('Đề Nghị TT (Mua Bán)'));
  expect(screen.getByRole('heading', { name: 'Đề Nghị TT (Mua Bán)' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx`
Expected: FAIL — Cannot find module `../DossierWorkspace`.

- [ ] **Step 3: Write implementation**

```tsx
// src/components/documents/dossier/DossierWorkspace.tsx
import React from 'react';
import type { UiClasses } from '../../../lib/uiClasses';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { TEMPLATE_BY_ID } from '../registry/templates';
import { CommonInfoForm } from './CommonInfoForm';
import { SPECIFIC_FORM_BY_ID } from './specificForms';
import { DocumentPreview } from '../DocumentPreview';

export const DossierWorkspace: React.FC<{
  styles: UiClasses;
  ctrl: ReturnType<typeof useDocumentDossierController>;
}> = ({ styles, ctrl }) => {
  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];
  return (
    <div className="space-y-0">
      <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/40 flex flex-wrap gap-2">
        {ctrl.visibleDocs.map(doc => {
          const tpl = TEMPLATE_BY_ID[doc.templateId];
          const active = ctrl.state.activeDocId === doc.templateId;
          const excluded = ctrl.isExcluded(doc.templateId);
          return (
            <div key={doc.templateId} className="flex items-center gap-1">
              {doc.optional && (
                <input type="checkbox" checked={!excluded}
                  onChange={() => ctrl.toggleOptional(doc.templateId)}
                  title="Bật/tắt giấy tờ tùy chọn" />
              )}
              <button type="button" disabled={excluded}
                onClick={() => ctrl.selectDoc(doc.templateId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  active ? 'bg-accent text-accent-ink border-accent'
                    : 'bg-surface text-ink-muted border-line/70 hover:border-accent'
                } ${excluded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                {tpl.label}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line/60">
        <div className="lg:col-span-6 lg:self-start p-4 sm:p-6 bg-panel/30 space-y-4">
          <CommonInfoForm common={ctrl.state.common} patch={ctrl.patchCommon} />
          {SpecificForm && (
            <div className="pl-4 border-l-2 border-accent/40">
              <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2">
                Phần riêng: {ctrl.activeTemplate.label}
              </div>
              <SpecificForm
                common={ctrl.state.common}
                specific={ctrl.activeSpecific}
                patch={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
              />
            </div>
          )}
        </div>
        <div className="lg:col-span-6 flex flex-col bg-surface/20 min-h-[700px]">
          <DocumentPreview
            styles={styles}
            docTitle={ctrl.activeTemplate.label}
            docFilename={ctrl.activeTemplate.id}
            docHtml={ctrl.activeHtml}
          />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test + type-check**

Run: `npx vitest run src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx && npx tsc --noEmit -p tsconfig.json`
Expected: PASS (2 tests), tsc no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/dossier/DossierWorkspace.tsx src/components/documents/dossier/__tests__/DossierWorkspace.test.tsx
git commit -m "feat(dossier-ui): DossierWorkspace ráp tab tầng 2 + form + preview"
```

---

## Task 5: Tích hợp vào `DocumentTemplateView` (thêm song song)

**Files:**
- Modify: `src/components/views/DocumentTemplateView.tsx`

**Interfaces:**
- Consumes: `useDocumentDossierController`, `DossierWorkspace`.

Thêm một mục chọn "📁 Hồ sơ giải ngân" ở đầu selector hiện tại (không đổi 8 mục cũ). Dùng một state cục bộ `mode: 'legacy' | 'dossier'`. Khi `mode==='dossier'` render `DossierWorkspace`; ngược lại render đúng khối cũ (TemplateSelector list 8 + 2 cột cũ) như hiện nay.

- [ ] **Step 1: Thêm state & nút** — trong `DocumentTemplateView`, thêm:

```tsx
const [mode, setMode] = useState<'legacy' | 'dossier'>('legacy');
const dossierCtrl = useDocumentDossierController();
```

Ngay dưới `<TemplateSelector .../>` thêm một hàng nút chuyển chế độ (một nút "📁 Hồ sơ giải ngân" bật `mode='dossier'`, và cho phép quay lại danh sách mẫu lẻ khi bấm một mẫu cũ → set `mode='legacy'`). Giữ nguyên phần render 2 cột cũ, chỉ bọc điều kiện `mode==='legacy'`.

- [ ] **Step 2: Render nhánh dossier**

```tsx
{mode === 'dossier'
  ? <DossierWorkspace styles={styles} ctrl={dossierCtrl} />
  : (/* khối 2 cột cũ giữ nguyên */)}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 4: Kiểm thử trên app thật (bắt buộc)**

Chạy dev server (`preview_start` name `web`), đăng nhập đã có, mở tab "Soạn biểu mẫu HĐ":
1. Bấm "📁 Hồ sơ giải ngân" → thấy 3 tab (HĐ Mua Bán, Đề Nghị TT, Cam Kết) + khối "Thông tin chung".
2. Sửa tên Bên A ở "Thông tin chung" → xem trước HĐ Mua Bán cập nhật; chuyển tab Đề Nghị TT → **tên vẫn còn** (điền một lần chảy cả bộ).
3. Tắt ô tích "Cam Kết" → tab mờ, không chọn được.
4. Bấm một mẫu cũ (vd "1. HĐ Thuê Mặt Bằng") → quay về đường cũ, hoạt động như trước.
5. Bấm "Tải Word" / "In / Xuất PDF" ở một tờ trong bộ → xuất đúng tờ.

Chụp màn hình các bước 1-2 làm bằng chứng.

- [ ] **Step 5: Commit**

```bash
git add src/components/views/DocumentTemplateView.tsx
git commit -m "feat(dossier-ui): thêm bộ Hồ sơ giải ngân song song trong tab soạn HĐ"
```

---

## Self-Review

**Spec coverage:**
- §5 state/luồng → Task 1 (hook bọc reducer, activeHtml dẫn xuất, patchCommon chảy vào preview).
- §6 selector 2 tầng → Task 5 (tầng 1: nút chế độ/danh mục) + Task 4 (tầng 2: tab tài liệu). Khối "Thông tin chung" thu gọn được → Task 2 (`<details open>`). Giấy tùy chọn bật/tắt bằng ô tích → Task 4.
- Cột trái common + phần riêng, cột phải preview/xuất → Task 4 (tái dùng `DocumentPreview`).
- Không phá 8 mẫu cũ → Task 5 (`mode` bọc điều kiện, đường cũ giữ nguyên).

**Placeholder scan:** Không có TBD; các bước UI có code thật; phần JSX lặp (input Bên A/B, list items) chỉ dẫn "theo pattern SaleForm/DocumentForm" đúng nguyên tắc "follow existing patterns" của codebase, kèm helper cập nhật bất biến cụ thể.

**Type consistency:** props `{ common, specific, patch }` khớp `DocTemplate.SpecificForm`; `SPECIFIC_FORM_BY_ID` id khớp `sale_contract`/`payment_request_sale`/`cam_ket`; `ctrl` type = `ReturnType<typeof useDocumentDossierController>` dùng nhất quán Task 4-5.

**Ngoài phạm vi (đúng chủ ý):** migrate 8 mẫu cũ thành dossier, "Bảng kê mua hàng" (builder mới), các danh mục khác → **Plan 3**.

## Execution Handoff

Plan 2 xong. Sau khi chạy: bộ "Giải ngân" dùng thật được trong tab, 8 mẫu cũ nguyên vẹn. Plan 3 sẽ migrate 8 mẫu cũ vào hệ dossier và thêm "Bảng kê mua hàng" + các danh mục còn lại.
