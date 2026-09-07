# Bộ biểu mẫu theo Hồ sơ — Plan 3c-1: Cho thuê + Dự toán Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Checkbox steps.

**Goal:** Thêm danh mục "Hồ sơ cho thuê" (Thuê mặt bằng + Thuê nhà ở) và bổ sung "Dự toán thi công" vào danh mục "Sửa chữa nhà" — tất cả qua adapter tái dùng `buildDocumentHtml` + golden test, đúng pattern đã có.

**Architecture:** 3 `DocTemplate` mới (`lease_mb`, `lease_house`, `const_estimate`) map `DossierCommon`+specific → `DocumentDraft` cũ. Thêm dossier `cho_thue`; thêm `const_estimate` vào dossier `sua_chua_nha`. Selector tầng-1 (đã map `dossiers` từ Plan 3a) tự hiện danh mục mới — **không cần sửa DocumentTemplateView**.

**Tech Stack:** TypeScript, React, vitest.

**Spec:** [docs/superpowers/specs/2026-09-07-bo-bieu-mau-ho-so-design.md](../specs/2026-09-07-bo-bieu-mau-ho-so-design.md)

## Global Constraints

- Không sửa [documentHtml.ts](../../../src/lib/documentHtml.ts), 8 mẫu cũ, controller cũ, forms cũ (chỉ đọc `monthsBetweenLabel` đã export).
- Không thêm dependency. Dùng lại `baseDraft`, registry types, `formatMoneyInput`, `DateInput`.
- Golden test **không tautology**: bản kỳ vọng dựng `DocumentDraft` bằng tay, điền giá trị khác rỗng cho **mọi field builder đọc**. Trước khi viết mỗi adapter, ĐỌC nhánh builder tương ứng trong documentHtml.ts để xác nhận field.
- Địa chỉ tài sản/công trình (`mbLocation`/`constSiteAddress`) để trong **specific của từng tờ** (chấp nhận nhập lại nếu 1 danh mục có nhiều tờ cùng địa chỉ — tối ưu chia sẻ để sau, khỏi đụng code đã review).
- Sau mỗi task: `npx tsc --noEmit -p tsconfig.json` sạch; test liên quan xanh.

## Field builder đọc (đã khảo sát)

- `lease_mb` (documentHtml.ts ~201-249): mbContractDate, mbLocation, mbPartyAName/Cccd/CccdDate/Address, mbPartyBName/Cccd/CccdDate/Address, mbStartDate, mbEndDate, mbMonthlyPrice, mbDepositAmount.
- `lease_house` (~338): lhFloors, lhLandArea, lhHouseArea, lhHandoverDate, lhPaymentDay, **lhTermLabel** (= monthsBetweenLabel(startDate,endDate)) + mbContractDate, mbLocation, mbPartyA*, mbPartyB*.
- `const_estimate` (~550): constContractDate, constItems, constPartyAName, constPartyBName, constPartyBCccd, constSiteAddress, constTotalPrice.

## File Structure

- Create: `registry/templates/leaseMb.ts`, `leaseHouse.ts`, `constEstimate.ts`.
- Create: `dossier/LeaseMbSpecificForm.tsx`, `LeaseHouseSpecificForm.tsx`, `EstimateSpecificForm.tsx`.
- Modify: `registry/templates/index.ts`, `registry/dossiers.ts`, `dossier/specificForms.ts`, `registry/__tests__/registry.test.ts`.
- Tests: `registry/__tests__/leaseMb.test.ts`, `leaseHouse.test.ts`, `constEstimate.test.ts`.

---

## Task 1: `lease_mb` template + golden test

**Files:** Create `registry/templates/leaseMb.ts`, `registry/__tests__/leaseMb.test.ts`.

**Produces:** `LeaseMbSpecific { location; monthlyPrice; depositAmount }`, `leaseMbTemplate`, `leaseMbToLegacyParams`.

- [ ] **Step 1: Test** (điền khác rỗng mọi field builder đọc)

```ts
// registry/__tests__/leaseMb.test.ts
import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { leaseMbTemplate, leaseMbToLegacyParams } from '../templates/leaseMb';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-23';
  c.partyA = { name: 'ĐỖ THỊ HIẾU', cccd: '0791 7802 5859', cccdDate: '29/11/2021', cccdPlace: 'CCS', address: 'Q10', birthYear: '' };
  c.partyB = { name: 'NGÔ NHỊ ĐẠT', cccd: '0343 0300 4676', cccdDate: '03/03/2022', cccdPlace: 'CCS', address: 'Dĩ An', birthYear: '' };
  c.startDate = '2026-04-23';
  c.endDate = '2027-04-22';
  return c;
}
const sampleSpecific = { location: '478/34 Hòa Hảo, Q10', monthlyPrice: '55.000.000', depositAmount: '72.000.000' };

it('maps common+specific into mb_* fields', () => {
  const d = leaseMbToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.mbPartyAName).toBe('ĐỖ THỊ HIẾU');
  expect(d.mbPartyBName).toBe('NGÔ NHỊ ĐẠT');
  expect(d.mbLocation).toBe('478/34 Hòa Hảo, Q10');
  expect(d.mbMonthlyPrice).toBe('55.000.000');
  expect(d.mbStartDate).toBe('2026-04-23');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('lease_mb', {
    ...baseDraft(),
    mbContractDate: '2026-04-23', mbLocation: '478/34 Hòa Hảo, Q10',
    mbPartyAName: 'ĐỖ THỊ HIẾU', mbPartyACccd: '0791 7802 5859', mbPartyACccdDate: '29/11/2021', mbPartyAAddress: 'Q10',
    mbPartyBName: 'NGÔ NHỊ ĐẠT', mbPartyBCccd: '0343 0300 4676', mbPartyBCccdDate: '03/03/2022', mbPartyBAddress: 'Dĩ An',
    mbStartDate: '2026-04-23', mbEndDate: '2027-04-22',
    mbMonthlyPrice: '55.000.000', mbDepositAmount: '72.000.000',
  });
  expect(leaseMbTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
// registry/templates/leaseMb.ts
import { Building2 } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface LeaseMbSpecific { location: string; monthlyPrice: string; depositAmount: string; }

export function leaseMbToLegacyParams(common: DossierCommon, s: LeaseMbSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    mbContractDate: common.contractDate,
    mbLocation: s.location,
    mbPartyAName: common.partyA.name, mbPartyACccd: common.partyA.cccd,
    mbPartyACccdDate: common.partyA.cccdDate, mbPartyAAddress: common.partyA.address,
    mbPartyBName: common.partyB.name, mbPartyBCccd: common.partyB.cccd,
    mbPartyBCccdDate: common.partyB.cccdDate, mbPartyBAddress: common.partyB.address,
    mbStartDate: common.startDate, mbEndDate: common.endDate,
    mbMonthlyPrice: s.monthlyPrice, mbDepositAmount: s.depositAmount,
  };
}

export const leaseMbTemplate: DocTemplate<LeaseMbSpecific> = {
  id: 'lease_mb',
  label: 'HĐ Thuê Mặt Bằng',
  icon: Building2,
  specificDefaults: { location: '', monthlyPrice: '', depositAmount: '' },
  buildHtml: (common, s) => buildDocumentHtml('lease_mb', leaseMbToLegacyParams(common, s)),
};
```

- [ ] **Step 4: Run → pass; tsc sạch.**
- [ ] **Step 5: Commit** — `git commit -m "feat(docs-registry): template HĐ thuê mặt bằng qua adapter + golden test"`

---

## Task 2: `lease_house` template + golden test

**Files:** Create `registry/templates/leaseHouse.ts`, `registry/__tests__/leaseHouse.test.ts`.

**Produces:** `LeaseHouseSpecific { location; floors; landArea; houseArea; handoverDate; paymentDay }`, `leaseHouseTemplate`, `leaseHouseToLegacyParams`. `lhTermLabel = monthsBetweenLabel(common.startDate, common.endDate)`.

- [ ] **Step 1: Test**

```ts
// registry/__tests__/leaseHouse.test.ts
import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { leaseHouseTemplate, leaseHouseToLegacyParams } from '../templates/leaseHouse';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-04-23';
  c.partyA = { name: 'ĐỖ THỊ HIẾU', cccd: '079', cccdDate: '29/11/2021', cccdPlace: '', address: 'Q10', birthYear: '' };
  c.partyB = { name: 'NGÔ NHỊ ĐẠT', cccd: '034', cccdDate: '03/03/2022', cccdPlace: '', address: 'Dĩ An', birthYear: '' };
  c.startDate = '2026-04-23'; c.endDate = '2027-04-22';
  return c;
}
const sampleSpecific = { location: 'Số 1 đường A', floors: '01', landArea: '80', houseArea: '75', handoverDate: '2026-04-23', paymentDay: '05' };

it('maps + derives lhTermLabel', () => {
  const d = leaseHouseToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.lhFloors).toBe('01');
  expect(d.mbPartyAName).toBe('ĐỖ THỊ HIẾU');
  expect(d.lhTermLabel).toBe(monthsBetweenLabel('2026-04-23', '2027-04-22'));
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('lease_house', {
    ...baseDraft(),
    mbContractDate: '2026-04-23', mbLocation: 'Số 1 đường A',
    mbPartyAName: 'ĐỖ THỊ HIẾU', mbPartyACccd: '079', mbPartyACccdDate: '29/11/2021', mbPartyAAddress: 'Q10',
    mbPartyBName: 'NGÔ NHỊ ĐẠT', mbPartyBCccd: '034', mbPartyBCccdDate: '03/03/2022', mbPartyBAddress: 'Dĩ An',
    lhFloors: '01', lhLandArea: '80', lhHouseArea: '75', lhHandoverDate: '2026-04-23', lhPaymentDay: '05',
    lhTermLabel: monthsBetweenLabel('2026-04-23', '2027-04-22'),
  });
  expect(leaseHouseTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
// registry/templates/leaseHouse.ts
import { Home } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface LeaseHouseSpecific {
  location: string; floors: string; landArea: string; houseArea: string; handoverDate: string; paymentDay: string;
}

export function leaseHouseToLegacyParams(common: DossierCommon, s: LeaseHouseSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    mbContractDate: common.contractDate,
    mbLocation: s.location,
    mbPartyAName: common.partyA.name, mbPartyACccd: common.partyA.cccd,
    mbPartyACccdDate: common.partyA.cccdDate, mbPartyAAddress: common.partyA.address,
    mbPartyBName: common.partyB.name, mbPartyBCccd: common.partyB.cccd,
    mbPartyBCccdDate: common.partyB.cccdDate, mbPartyBAddress: common.partyB.address,
    lhFloors: s.floors, lhLandArea: s.landArea, lhHouseArea: s.houseArea,
    lhHandoverDate: s.handoverDate, lhPaymentDay: s.paymentDay,
    lhTermLabel: monthsBetweenLabel(common.startDate, common.endDate),
  };
}

export const leaseHouseTemplate: DocTemplate<LeaseHouseSpecific> = {
  id: 'lease_house',
  label: 'HĐ Thuê Nhà Ở',
  icon: Home,
  specificDefaults: { location: '', floors: '', landArea: '', houseArea: '', handoverDate: '', paymentDay: '' },
  buildHtml: (common, s) => buildDocumentHtml('lease_house', leaseHouseToLegacyParams(common, s)),
};
```

- [ ] **Step 4: Run → pass; tsc sạch.**
- [ ] **Step 5: Commit** — `git commit -m "feat(docs-registry): template HĐ thuê nhà ở qua adapter + golden test"`

---

## Task 3: `const_estimate` template + golden test

**Files:** Create `registry/templates/constEstimate.ts`, `registry/__tests__/constEstimate.test.ts`.

**Produces:** `EstimateSpecific { siteAddress }`, `constEstimateTemplate`, `estimateToLegacyParams`. Map: partyA→constPartyAName, partyB→constPartyBName/Cccd, items→constItems, totalAmount→constTotalPrice, contractDate→constContractDate.

- [ ] **Step 1: Test**

```ts
// registry/__tests__/constEstimate.test.ts
import { it, expect } from 'vitest';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { baseDraft } from '../legacyDraft';
import { emptyCommon } from '../types';
import { constEstimateTemplate, estimateToLegacyParams } from '../templates/constEstimate';

function sampleCommon() {
  const c = emptyCommon();
  c.contractDate = '2026-03-18';
  c.partyA = { name: 'LÝ THỊ THÙY DUNG', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.partyB = { name: 'ĐỖ THỊ LAN ANH', cccd: '0343 0300 4676', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
  c.totalAmount = '1.003.700.000';
  c.items = [{ id: '1', name: 'Sửa tường', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Bả vữa' }];
  return c;
}
const sampleSpecific = { siteAddress: '478/34 Hòa Hảo, Q10' };

it('maps common+specific into const_* estimate fields', () => {
  const d = estimateToLegacyParams(sampleCommon(), sampleSpecific);
  expect(d.constPartyAName).toBe('LÝ THỊ THÙY DUNG');
  expect(d.constPartyBName).toBe('ĐỖ THỊ LAN ANH');
  expect(d.constSiteAddress).toBe('478/34 Hòa Hảo, Q10');
  expect(d.constItems).toHaveLength(1);
  expect(d.constTotalPrice).toBe('1.003.700.000');
});

it('buildHtml equals legacy builder (golden)', () => {
  const common = sampleCommon();
  const expected = buildDocumentHtml('const_estimate', {
    ...baseDraft(),
    constContractDate: '2026-03-18',
    constPartyAName: 'LÝ THỊ THÙY DUNG',
    constPartyBName: 'ĐỖ THỊ LAN ANH', constPartyBCccd: '0343 0300 4676',
    constSiteAddress: '478/34 Hòa Hảo, Q10',
    constTotalPrice: '1.003.700.000',
    constItems: common.items as any,
  });
  expect(constEstimateTemplate.buildHtml(common, sampleSpecific)).toBe(expected);
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
// registry/templates/constEstimate.ts
import { Calculator } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { ConstItem } from '../../DocumentForm';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface EstimateSpecific { siteAddress: string; }

export function estimateToLegacyParams(common: DossierCommon, s: EstimateSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constSiteAddress: s.siteAddress,
    constTotalPrice: common.totalAmount,
    constItems: common.items as ConstItem[],
  };
}

export const constEstimateTemplate: DocTemplate<EstimateSpecific> = {
  id: 'const_estimate',
  label: 'Dự Toán Thi Công',
  icon: Calculator,
  specificDefaults: { siteAddress: '' },
  buildHtml: (common, s) => buildDocumentHtml('const_estimate', estimateToLegacyParams(common, s)),
};
```

- [ ] **Step 4: Run → pass; tsc sạch.**
- [ ] **Step 5: Commit** — `git commit -m "feat(docs-registry): template Dự toán thi công qua adapter + golden test"`

---

## Task 4: Form phần riêng cho 3 tờ + đăng ký

**Files:** Create `dossier/LeaseMbSpecificForm.tsx`, `LeaseHouseSpecificForm.tsx`, `EstimateSpecificForm.tsx`; Modify `dossier/specificForms.ts`, `registry/templates/index.ts`.

Dùng lại pattern INPUT/LABEL của [SaleSpecificForm.tsx](../../../src/components/documents/dossier/SaleSpecificForm.tsx). `DateInput` cho các field ngày (`handoverDate`), `formatMoneyInput` cho tiền.

- [ ] **Step 1: `LeaseMbSpecificForm`** — field: location (text), monthlyPrice (money), depositAmount (money).
- [ ] **Step 2: `LeaseHouseSpecificForm`** — field: location (text), floors, landArea, houseArea (text), handoverDate (`DateInput` → patch iso), paymentDay (text).
- [ ] **Step 3: `EstimateSpecificForm`** — field: siteAddress (text).

Mẫu code (LeaseMb; hai form kia tương tự, đổi field):

```tsx
import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { LeaseMbSpecific } from '../registry/templates/leaseMb';
import { formatMoneyInput } from '../../../lib/utils';
const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';
export const LeaseMbSpecificForm: React.FC<{
  common: DossierCommon; specific: LeaseMbSpecific; patch: (p: Partial<LeaseMbSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2"><label className={LABEL}>Địa chỉ mặt bằng</label>
      <input className={INPUT} value={specific.location} onChange={e => patch({ location: e.target.value })} /></div>
    <div><label className={LABEL}>Giá thuê / tháng (VNĐ)</label>
      <input className={INPUT} value={specific.monthlyPrice} onChange={e => patch({ monthlyPrice: formatMoneyInput(e.target.value) })} /></div>
    <div><label className={LABEL}>Tiền đặt cọc (VNĐ)</label>
      <input className={INPUT} value={specific.depositAmount} onChange={e => patch({ depositAmount: formatMoneyInput(e.target.value) })} /></div>
  </div>
);
```

Cho `handoverDate` trong LeaseHouse dùng:
```tsx
import { DateInput } from '../DateInput';
// ...
<DateInput value={specific.handoverDate} onChange={(iso) => patch({ handoverDate: iso })} className={INPUT} />
```

- [ ] **Step 4: Đăng ký** — `specificForms.ts` thêm `lease_mb`, `lease_house`, `const_estimate`; `templates/index.ts` thêm 3 template vào `TEMPLATE_BY_ID`.

- [ ] **Step 5: tsc sạch + commit**

```bash
git add src/components/documents/dossier/LeaseMbSpecificForm.tsx src/components/documents/dossier/LeaseHouseSpecificForm.tsx src/components/documents/dossier/EstimateSpecificForm.tsx src/components/documents/dossier/specificForms.ts src/components/documents/registry/templates/index.ts
git commit -m "feat(dossier-ui): form phần riêng cho thuê mặt bằng/nhà ở/dự toán + đăng ký"
```

---

## Task 5: Dossier "Cho thuê" + thêm Dự toán vào Sửa chữa nhà + test

**Files:** Modify `registry/dossiers.ts`, `registry/__tests__/registry.test.ts`.

- [ ] **Step 1: Cập nhật `dossiers.ts`**

Thêm dossier mới (import `Home`):
```ts
  {
    id: 'cho_thue',
    label: 'Hồ sơ cho thuê',
    icon: Home,
    documents: [
      { templateId: 'lease_mb' },
      { templateId: 'lease_house' },
    ],
  },
```
Trong dossier `sua_chua_nha`, chèn `{ templateId: 'const_estimate' }` **sau** `construction`:
```ts
    documents: [
      { templateId: 'construction' },
      { templateId: 'const_estimate' },
      { templateId: 'payment_request_const' },
      { templateId: 'cam_ket', optional: true },
    ],
```

- [ ] **Step 2: Cập nhật test toàn vẹn** — trong `registry.test.ts`:

```ts
it('Cho thuê dossier lists its documents', () => {
  const d = DOSSIERS.find(x => x.id === 'cho_thue');
  expect(d?.documents.map(x => x.templateId)).toEqual(['lease_mb', 'lease_house']);
});
it('Sửa chữa nhà dossier includes dự toán after construction', () => {
  const d = DOSSIERS.find(x => x.id === 'sua_chua_nha');
  expect(d?.documents.map(x => x.templateId)).toEqual([
    'construction', 'const_estimate', 'payment_request_const', 'cam_ket',
  ]);
});
```
(Sửa lại case "Sửa chữa nhà" cũ nếu đã có — cập nhật cho khớp 4 tài liệu.)

- [ ] **Step 3: Run test + tsc**

Run: `npx vitest run src/components/documents/registry/__tests__/registry.test.ts && npx tsc --noEmit -p tsconfig.json`
Expected: PASS; "every dossier document references an existing template" xanh.

- [ ] **Step 4: Kiểm thử app (parent)** — 4 nút danh mục (Giải ngân, Sửa chữa nhà, Cho thuê, …). "Cho thuê" → 2 tab (Thuê Mặt Bằng, Thuê Nhà Ở), điền Bên A ở Thông tin chung chảy vào cả 2. "Sửa chữa nhà" giờ có thêm tab "Dự Toán Thi Công".

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/registry/dossiers.ts src/components/documents/registry/__tests__/registry.test.ts
git commit -m "feat(dossier): danh mục Cho thuê + thêm Dự toán vào Sửa chữa nhà"
```

---

## Self-Review

**Spec coverage:** danh mục Cho thuê (Thuê MB + Thuê nhà) và Dự toán vào Sửa nhà (yêu cầu người dùng) → Task 5; adapter+golden 3 tờ → Task 1-3; form phần riêng → Task 4; selector tầng-1 tự cập nhật (Plan 3a) → không cần sửa view.

**Placeholder scan:** code thật; golden dựng draft kỳ vọng bằng tay, giá trị khác rỗng cho field builder đọc.

**Type consistency:** `LeaseMbSpecific`/`LeaseHouseSpecific`/`EstimateSpecific` khớp form+adapter+test; id `lease_mb`/`lease_house`/`const_estimate`/`cho_thue` nhất quán.

**Đã biết (chấp nhận):** `mbLocation`/`constSiteAddress` nằm ở specific → nếu một danh mục có 2 tờ cùng địa chỉ thì nhập lại. Tối ưu chia sẻ (đưa vào common) để Plan sau, tránh churn code đã review.

## Execution Handoff

Sau 3c-1: 4 danh mục hồ sơ chạy thật; còn duy nhất **Đặt cọc** chưa vào danh mục. Plan 3c-2: đưa Đặt cọc vào "Khác" rồi **bỏ chế độ song song** (khi mọi mẫu đã có trong danh mục).
