import React from 'react';
import type { DossierCommon } from '../registry/types';
import type { EstimateSpecific } from '../registry/templates/constEstimate';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export const EstimateSpecificForm: React.FC<{
  common: DossierCommon; specific: EstimateSpecific; patch: (p: Partial<EstimateSpecific>) => void;
}> = ({ specific, patch }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="sm:col-span-2">
      <label className={LABEL}>Công trình / Địa điểm</label>
      <input className={INPUT} value={specific.siteAddress}
        onChange={e => patch({ siteAddress: e.target.value })} />
    </div>
  </div>
);
