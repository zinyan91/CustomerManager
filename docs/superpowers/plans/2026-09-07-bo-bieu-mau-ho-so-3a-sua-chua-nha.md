# Bộ biểu mẫu theo Hồ sơ — Plan 3a: Danh mục "Sửa chữa nhà" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thêm danh mục thứ hai "Hồ sơ sửa chữa nhà" (HĐ Thi Công + Đề Nghị TT Thi Công + Cam kết) vào hệ dossier, chứng minh selector tầng-1 nhiều danh mục và tái dùng lại pattern adapter+golden.

**Architecture:** Thêm 2 `DocTemplate` mới (`construction`, `payment_request_const`) map `DossierCommon`+specific → `DocumentDraft` cũ rồi gọi `buildDocumentHtml` (như Plan 1). Thêm form phần riêng cho HĐ Thi Công; Đề Nghị TT Thi Công tái dùng `PaymentSpecificForm`. Thêm dossier `sua_chua_nha`. Trong `DocumentTemplateView` đổi nút chế độ đơn cứng thành **một nút mỗi danh mục** (map `dossierCtrl.dossiers`).

**Tech Stack:** TypeScript, React, vitest.

**Spec:** [docs/superpowers/specs/2026-09-07-bo-bieu-mau-ho-so-design.md](../specs/2026-09-07-bo-bieu-mau-ho-so-design.md)

## Global Constraints

- Không sửa [documentHtml.ts](../../../src/lib/documentHtml.ts) (chỉ tái dùng qua adapter) và không sửa 8 mẫu cũ / controller cũ / forms cũ.
- Không thêm dependency. Dùng lại `baseDraft`, registry types, `PaymentSpecific`/`PaymentSpecificForm` (Plan 1/2).
- Sau mỗi task: `npx tsc --noEmit -p tsconfig.json` sạch; test liên quan xanh.
- **Golden test phải có nghĩa**: dữ liệu mẫu điền **giá trị khác rỗng cho MỌI field mà builder đọc**, và bản kỳ vọng dựng `DocumentDraft` bằng tay (không gọi adapter) → nếu adapter bỏ sót một field, HTML lệch và test rớt. Trước khi viết adapter `construction`, ĐỌC nhánh `if (selectedTemplate === 'construction')` trong [documentHtml.ts](../../../src/lib/documentHtml.ts) để liệt kê đúng các field nó dùng.

## File Structure

- `src/components/documents/registry/templates/construction.ts` — `ConstructionSpecific`, `constructionTemplate`, `constToLegacyParams`.
- `src/components/documents/registry/templates/paymentRequestConst.ts` — `paymentRequestConstTemplate`, `paymentConstToLegacyParams` (dùng lại `PaymentSpecific`).
- `src/components/documents/dossier/ConstructionSpecificForm.tsx` — form phần riêng HĐ Thi Công.
- Sửa: `registry/templates/index.ts` (thêm 2 template), `registry/dossiers.ts` (thêm dossier), `dossier/specificForms.ts` (map 2 id), `views/DocumentTemplateView.tsx` (tầng-1 nhiều nút).
- Tests: `registry/__tests__/construction.test.ts`, `registry/__tests__/paymentRequestConst.test.ts`, cập nhật `registry/__tests__/registry.test.ts`.

---

## Task 1: `construction` template + golden test

**Files:**
- Create: `src/components/documents/registry/templates/construction.ts`
- Test: `src/components/documents/registry/__tests__/construction.test.ts`

**Interfaces:**
- Consumes: `DocTemplate`, `DossierCommon` (types); `baseDraft`; `buildDocumentHtml`, `DocumentDraft`; `monthsBetweenLabel` từ [useDocumentTemplateController](../../../src/hooks/useDocumentTemplateController.ts) (đã export); `ConstItem` từ `../../DocumentForm`; `Hammer` từ `lucide-react`.
- Produces: `ConstructionSpecific { siteAddress; depositStage1; stage2Amount; warrantyMonths }`, `constructionTemplate`, `constToLegacyParams`.

Map: partyA=bên A thi công, partyB=bên B thi công; `items`→`constItems`; `totalAmount`→`constTotalPrice`; ngày→`constStartDate/constEndDate`; `constDurationMonths` = `monthsBetweenLabel(startDate,endDate)`.

- [ ] **Step 1: ĐỌC nhánh `construction` của `buildDocumentHtml`** để xác nhận field. Rồi viết test (điền giá trị khác rỗng cho mọi field):

```ts
// src/components/documents/registry/__tests__/construction.test.ts
import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { constructionTemplate, constToLegacyParams } from '../templates/construction';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '0791 7802 5859', cccdDate: '29/11/2021',
    cccdPlace: 'CCS', address: '233/3/1 Đường Vĩnh Viễn, Q10', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '03/03/2022',
    cccdPlace: 'CCS', address: 'Bình Dương', birthYear: '' };
  c.startDate = '2026-03-20';
  c.endDate = '2026-05-20';
  c.totalAmount = '1.003.700.000';
  c.items = [{ id: '1', name: 'Sửa tường', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Bả vữa' }];
  return c;
}
const sampleSpecific = { siteAddress: '478/34 Hòa Hảo, Q10', depositStage1: '53.700.000',
  stage2Amount: '950.000.000', warrantyMonths: '06' };

it('constToLegacyParams maps common+specific into const_* legacy fields', () => {
  const d = constToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constContractDate).toBe('2026-03-18');
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constSiteAddress).toBe('478/34 Hòa Hảo, Q10');
  expect(d.constTotalPrice).toBe('1.003.700.000');
  expect(d.constItems).toHaveLength(1);
  expect(d.constDurationMonths).toBe(monthsBetweenLabel('2026-03-20', '2026-05-20'));
});

it('buildHtml equals legacy builder for the same data (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('construction', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyACccd: '0791 7802 5859',
    constPartyAAddress: '233/3/1 Đường Vĩnh Viễn, Q10',
    constPartyBName: 'ĐỖ THỊ LAN ANH',
    constPartyBCccd: '0343 0300 4676',
    constSiteAddress: '478/34 Hòa Hảo, Q10',
    constStartDate: '2026-03-20',
    constEndDate: '2026-05-20',
    constTotalPrice: '1.003.700.000',
    constDepositStage1: '53.700.000',
    constStage2Amount: '950.000.000',
    constWarrantyMonths: '06',
    constItems: common.items as any,
    constDurationMonths: monthsBetweenLabel('2026-03-20', '2026-05-20'),
  });
  expect(constructionTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
```

- [ ] **Step 2: Run test → fail** (`Cannot find module ../templates/construction`).

Run: `npx vitest run src/components/documents/registry/__tests__/construction.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/components/documents/registry/templates/construction.ts
import { Hammer } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import type { ConstItem } from '../../DocumentForm';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface ConstructionSpecific {
  siteAddress: string;
  depositStage1: string;
  stage2Amount: string;
  warrantyMonths: string;
}

export function constToLegacyParams(common: DossierCommon, s: ConstructionSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyACccd: common.partyA.cccd,
    constPartyAAddress: common.partyA.address,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constSiteAddress: s.siteAddress,
    constStartDate: common.startDate,
    constEndDate: common.endDate,
    constTotalPrice: common.totalAmount,
    constDepositStage1: s.depositStage1,
    constStage2Amount: s.stage2Amount,
    constWarrantyMonths: s.warrantyMonths,
    constItems: common.items as ConstItem[],
    constDurationMonths: monthsBetweenLabel(common.startDate, common.endDate),
  };
}

export const constructionTemplate: DocTemplate<ConstructionSpecific> = {
  id: 'construction',
  label: 'HĐ Thi Công Nhà Ở',
  icon: Hammer,
  specificDefaults: { siteAddress: '', depositStage1: '', stage2Amount: '', warrantyMonths: '' },
  buildHtml: (common, s) => buildDocumentHtml('construction', constToLegacyParams(common, s)),
};
```

Nếu golden rớt: builder `construction` đọc một field mình chưa map — thêm vào `constToLegacyParams` và vào bản kỳ vọng (đừng sửa builder).

- [ ] **Step 4: Run test → pass**; `npx tsc --noEmit -p tsconfig.json` sạch.
- [ ] **Step 5: Commit**

```bash
git add src/components/documents/registry/templates/construction.ts src/components/documents/registry/__tests__/construction.test.ts
git commit -m "feat(docs-registry): template HĐ thi công qua adapter + golden test"
```

---

## Task 2: `payment_request_const` template + golden test

**Files:**
- Create: `src/components/documents/registry/templates/paymentRequestConst.ts`
- Test: `src/components/documents/registry/__tests__/paymentRequestConst.test.ts`

**Interfaces:**
- Consumes: `PaymentSpecific` từ `./paymentRequestSale`; `baseDraft`; `buildDocumentHtml`; `CreditCard`.
- Produces: `paymentRequestConstTemplate` (id `payment_request_const`, `specificDefaults` giống paymentRequestSale), `paymentConstToLegacyParams`.

Map (theo [documentHtml.ts:747-799](../../../src/lib/documentHtml.ts) nhánh không phải sale): buyer=constPartyAName, seller=constPartyBName, contractDate=constContractDate, total=constTotalPrice; `stages→payStages`, bank→`payBank*`, cash→`payCash*`.

- [ ] **Step 1: Write failing test**

```ts
// src/components/documents/registry/__tests__/paymentRequestConst.test.ts
import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { paymentRequestConstTemplate, paymentConstToLegacyParams } from '../templates/paymentRequestConst';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.totalAmount = '1.003.700.000';
  c.bank = { owner: 'ĐỖ THỊ LAN ANH', accNo: '0123456789', name: 'Vietcombank', branch: 'CN TP.HCM' };
  c.stages = [{ id: '1', stageName: 'Đợt 1', amount: '53.700.000', status: 'paid', note: '' }];
  return c;
}
const sampleSpecific = { payMethodType: 'transfer' as const, recipientTitle: 'Bà' as const,
  cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '' };

it('maps to const_* buyer/seller, shared stages, bank', () => {
  const d = paymentConstToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constTotalPrice).toBe('1.003.700.000');
  expect(d.payStages).toHaveLength(1);
  expect(d.payBankOwner).toBe('ĐỖ THỊ LAN ANH');
  expect(d.recipientTitle).toBe('Bà');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('payment_request_const', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyBName: 'ĐỖ THỊ LAN ANH',
    constPartyBCccd: '0343 0300 4676',
    constTotalPrice: '1.003.700.000',
    payStages: common.stages,
    payMethodType: 'transfer',
    recipientTitle: 'Bà',
    payBankOwner: 'ĐỖ THỊ LAN ANH',
    payBankAccNo: '0123456789',
    payBankName: 'Vietcombank',
    payBankBranch: 'CN TP.HCM',
  });
  expect(paymentRequestConstTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
// src/components/documents/registry/templates/paymentRequestConst.ts
import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import type { PaymentSpecific } from './paymentRequestSale';
import { baseDraft } from '../legacyDraft';

export function paymentConstToLegacyParams(common: DossierCommon, s: PaymentSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constTotalPrice: common.totalAmount,
    payStages: common.stages,
    payMethodType: s.payMethodType,
    recipientTitle: s.recipientTitle,
    payCashName: s.cashName,
    payCashCccd: s.cashCccd,
    payCashCccdDate: s.cashCccdDate,
    payCashCccdPlace: s.cashCccdPlace,
    payBankOwner: common.bank.owner,
    payBankAccNo: common.bank.accNo,
    payBankName: common.bank.name,
    payBankBranch: common.bank.branch,
  };
}

export const paymentRequestConstTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_const',
  label: 'Đề Nghị TT (Thi Công)',
  icon: CreditCard,
  specificDefaults: {
    payMethodType: 'transfer', recipientTitle: 'Ông',
    cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
  },
  buildHtml: (common, s) => buildDocumentHtml('payment_request_const', paymentConstToLegacyParams(common, s)),
};
```

- [ ] **Step 4: Run → pass; tsc sạch.**
- [ ] **Step 5: Commit**

```bash
git add src/components/documents/registry/templates/paymentRequestConst.ts src/components/documents/registry/__tests__/paymentRequestConst.test.ts
git commit -m "feat(docs-registry): template Đề nghị TT (thi công) qua adapter + golden test"
```

---

## Task 3: Form phần riêng HĐ Thi Công + đăng ký + dossier

**Files:**
- Create: `src/components/documents/dossier/ConstructionSpecificForm.tsx`
- Modify: `src/components/documents/dossier/specificForms.ts`
- Modify: `src/components/documents/registry/templates/index.ts`
- Modify: `src/components/documents/registry/dossiers.ts`
- Test: cập nhật `src/components/documents/registry/__tests__/registry.test.ts`

- [ ] **Step 1: `ConstructionSpecificForm.tsx`**

```tsx
import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { ConstructionSpecific } from '../registry/templates/construction';
import { formatMoneyInput } from '../../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const ConstructionSpecificForm: React.FC<{
  common: DossierCommon; specific: ConstructionSpecific; patch: (p: Partial<ConstructionSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2">
      <label className={LABEL}>Địa chỉ công trình</label>
      <input className={INPUT} value={specific.siteAddress}
        onChange={e => patch({ siteAddress: e.target.value })} />
    </div>
    <div>
      <label className={LABEL}>Tạm ứng đợt 1 (VNĐ)</label>
      <input className={INPUT} value={specific.depositStage1}
        onChange={e => patch({ depositStage1: formatMoneyInput(e.target.value) })} />
    </div>
    <div>
      <label className={LABEL}>Thanh toán đợt 2 (VNĐ)</label>
      <input className={INPUT} value={specific.stage2Amount}
        onChange={e => patch({ stage2Amount: formatMoneyInput(e.target.value) })} />
    </div>
    <div>
      <label className={LABEL}>Bảo hành (tháng)</label>
      <input className={INPUT} value={specific.warrantyMonths}
        onChange={e => patch({ warrantyMonths: e.target.value })} />
    </div>
  </div>
);
```

- [ ] **Step 2: Đăng ký form + template + dossier**

`specificForms.ts` — thêm 2 dòng:
```ts
import { ConstructionSpecificForm } from './ConstructionSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';
// trong SPECIFIC_FORM_BY_ID:
  construction: ConstructionSpecificForm,
  payment_request_const: PaymentSpecificForm,
```

`registry/templates/index.ts` — thêm:
```ts
import { constructionTemplate } from './construction';
import { paymentRequestConstTemplate } from './paymentRequestConst';
// trong TEMPLATE_BY_ID:
  [constructionTemplate.id]: constructionTemplate,
  [paymentRequestConstTemplate.id]: paymentRequestConstTemplate,
```

`registry/dossiers.ts` — thêm dossier (import `Hammer`):
```ts
import { FolderOpen, Hammer } from 'lucide-react';
// thêm phần tử vào DOSSIERS:
  {
    id: 'sua_chua_nha',
    label: 'Hồ sơ sửa chữa nhà',
    icon: Hammer,
    documents: [
      { templateId: 'construction' },
      { templateId: 'payment_request_const' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
```

- [ ] **Step 3: Cập nhật test toàn vẹn** — thêm vào `registry.test.ts`:

```ts
it('Sửa chữa nhà dossier lists its documents in order', () => {
  const d = DOSSIERS.find(x => x.id === 'sua_chua_nha');
  expect(d?.documents.map(x => x.templateId)).toEqual([
    'construction', 'payment_request_const', 'cam_ket',
  ]);
});
```

- [ ] **Step 4: Run test toàn vẹn + tsc**

Run: `npx vitest run src/components/documents/registry/__tests__/registry.test.ts src/components/documents/dossier/__tests__/specificForms.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS; test cũ "every dossier document references an existing template" vẫn xanh (đã có 2 template mới).

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/dossier/ConstructionSpecificForm.tsx src/components/documents/dossier/specificForms.ts src/components/documents/registry/templates/index.ts src/components/documents/registry/dossiers.ts src/components/documents/registry/__tests__/registry.test.ts
git commit -m "feat(dossier): danh mục Hồ sơ sửa chữa nhà + form HĐ thi công"
```

---

## Task 4: Selector tầng-1 nhiều danh mục trong `DocumentTemplateView`

**Files:**
- Modify: `src/components/views/DocumentTemplateView.tsx`

Hiện có 1 nút cứng "📁 Hồ sơ giải ngân" bật `mode='dossier'`. Đổi thành **một nút mỗi danh mục** (map `dossierCtrl.dossiers`), bấm nút nào thì `setMode('dossier')` + `dossierCtrl.selectDossier(d.id)`, active khi `mode==='dossier' && dossierCtrl.activeDossier.id===d.id`.

- [ ] **Step 1: Thay khối nút chế độ**

```tsx
<div className="px-3.5 sm:px-4 py-2.5 border-b border-line/60 bg-surface/30 flex flex-wrap gap-2">
  {dossierCtrl.dossiers.map(d => {
    const active = mode === 'dossier' && dossierCtrl.activeDossier.id === d.id;
    const Icon = d.icon;
    return (
      <button key={d.id} type="button"
        onClick={() => { setMode('dossier'); dossierCtrl.selectDossier(d.id); }}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
          active ? 'bg-accent text-accent-ink border-accent'
            : 'bg-surface text-ink-muted border-line/70 hover:border-accent'
        }`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{d.label}</span>
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: tsc sạch.**

Run: `npx tsc --noEmit -p tsconfig.json`

- [ ] **Step 3: Kiểm thử trên app thật (parent làm)** — mở tab, thấy 2 nút danh mục ("Hồ sơ giải ngân", "Hồ sơ sửa chữa nhà"); bấm "sửa chữa nhà" → 3 tab (HĐ Thi Công, Đề Nghị TT (Thi Công), Cam Kết); điền Bên A ở Thông tin chung → chảy vào cả HĐ Thi Công lẫn Đề Nghị TT; 8 mẫu cũ + bộ giải ngân vẫn chạy.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/DocumentTemplateView.tsx
git commit -m "feat(dossier): selector tầng-1 render một nút mỗi danh mục"
```

---

## Self-Review

**Spec coverage:** danh mục thứ 2 (§4.3 tái dùng template — cam_ket dùng chung 2 dossier) → Task 3; adapter tái dùng builder + golden (§7.1) → Task 1-2; selector tầng-1 nhiều danh mục (§6) → Task 4; form phần riêng → Task 3 (+ tái dùng PaymentSpecificForm cho Đề Nghị TT Thi Công).

**Placeholder scan:** không TBD; code thật; golden test dựng draft kỳ vọng bằng tay, điền field khác rỗng → không tautology. Có chỉ dẫn ĐỌC nhánh builder `construction` để không sót field.

**Type consistency:** `PaymentSpecific` tái dùng cho payment_request_const; `ConstructionSpecific` khớp form & adapter & test; id `construction`/`payment_request_const`/`sua_chua_nha` nhất quán giữa templates/dossiers/specificForms/test.

**Ngoài phạm vi (Plan 3b/3c):** Bảng kê mua hàng (cần chốt hướng), migrate mẫu lẻ còn lại (lease_mb, lease_house, const_estimate, deposit) & bỏ chế độ song song, các danh mục khác.

## Execution Handoff

Sau Plan 3a: 2 danh mục hồ sơ chạy thật, 8 mẫu cũ nguyên. Tiếp theo Plan 3b (Bảng kê — hỏi hướng) rồi Plan 3c (gom mẫu lẻ + bỏ chế độ song song).
