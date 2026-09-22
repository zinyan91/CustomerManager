import React, { useMemo } from 'react';
import { loadCardFeeProfiles } from '../../../lib/cardFeeStore';
import type { CcPhieuYeuCauSpecific } from '../registry/templates/ccPhieuYeuCau';
import type { DossierCommon } from '../registry/types';

export const CcPhieuYeuCauSpecificForm: React.FC<{
  common: DossierCommon;
  specific: CcPhieuYeuCauSpecific;
  patch: (p: Partial<CcPhieuYeuCauSpecific>) => void;
}> = ({ specific, patch }) => {
  const feeProfiles = useMemo(() => loadCardFeeProfiles(), []);

  const productPlans = useMemo(() => {
    const plans = new Set<string>();
    feeProfiles.forEach(p => plans.add(p.productMan));
    return Array.from(plans);
  }, [feeProfiles]);

  const feeIntProfiles = useMemo(() => {
    if (!specific.productPlan) return feeProfiles.map(p => p.feeIntProfile);
    return feeProfiles
      .filter(p => p.productMan === specific.productPlan)
      .map(p => p.feeIntProfile);
  }, [feeProfiles, specific.productPlan]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-ink">Loại thẻ (Product Plan)</label>
        <select
          value={specific.productPlan || ''}
          onChange={e => patch({ productPlan: e.target.value })}
          className="w-full bg-surface border border-line/60 rounded-xl px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        >
          <option value="">-- Chọn loại thẻ --</option>
          {productPlans.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-ink">Mã phí thẻ (Fee Int Profile)</label>
        <select
          value={specific.feeIntProfile || ''}
          onChange={e => patch({ feeIntProfile: e.target.value })}
          className="w-full bg-surface border border-line/60 rounded-xl px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        >
          <option value="">-- Chọn mã phí thẻ --</option>
          {feeIntProfiles.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
