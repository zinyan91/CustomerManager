import React from 'react';
import { DossierNavigation } from './DossierNavigation';
import type { UiClasses } from '../../../lib/uiClasses';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { CommonInfoForm } from './CommonInfoForm';
import { CreditCardCommonForm } from './CreditCardCommonForm';
import { SPECIFIC_FORM_BY_ID } from './specificForms';
import { DocumentPreview } from '../DocumentPreview';
import { StandaloneDocPreview } from './StandaloneDocPreview';
import { downloadBytes } from '../../../lib/xlsExport';
import { MIME_XLSX } from '../../../lib/xlsxWriter';
import { todayIso } from '../../../lib/utils';

export const DossierWorkspace: React.FC<{
  styles: UiClasses;
  ctrl: ReturnType<typeof useDocumentDossierController>;
  treeNavigation?: boolean;
  leading?: React.ReactNode;
}> = ({ styles, ctrl, treeNavigation, leading }) => {
  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];

  const handleExportExcel = () => {
    if (!ctrl.activeTemplate.buildXlsx) return;
    const bytes = ctrl.activeTemplate.buildXlsx(ctrl.state.common, ctrl.activeSpecific);
    const partyBName = ctrl.state.common.partyB.name.trim();
    const safeName = partyBName ? partyBName.replace(/\s+/g, '_') : (ctrl.state.activeDocId === 'const_estimate' ? 'Du_Toan' : 'Bang_Ke');
    const dateStr = ctrl.state.common.contractDate || todayIso();
    const fileName = ctrl.state.activeDocId === 'const_estimate'
      ? `BANG_DU_TOAN_CHI_TIET_${safeName}_${dateStr}.xlsx`
      : `Bang_Ke_Thu_Mua_${safeName}_${dateStr}.xlsx`;
    downloadBytes(bytes, fileName, MIME_XLSX);
  };

  return (
    <div className="space-y-0">
      <DossierNavigation ctrl={ctrl} treeNavigation={treeNavigation} leading={leading} />

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line/60">
        <div className="lg:col-span-6 lg:self-start p-4 sm:p-6 bg-panel/30 space-y-4">
          {ctrl.state.activeDossierId === 'van_hanh_tap_trung' ? (
            SpecificForm ? (
              <SpecificForm
                common={ctrl.state.common}
                specific={ctrl.activeSpecific}
                patch={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
              />
            ) : null
          ) : ctrl.state.activeDossierId === 'the_tin_dung' ? (
            <CreditCardCommonForm
              common={ctrl.state.common}
              patch={ctrl.patchCommon}
              activeDocId={ctrl.state.activeDocId}
              activeSpecific={ctrl.activeSpecific}
              patchSpecific={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
            />
          ) : ctrl.state.activeDocId === 'const_estimate' ? (
            SpecificForm ? (
              <SpecificForm
                common={ctrl.state.common}
                specific={ctrl.activeSpecific}
                patch={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
                patchCommon={ctrl.patchCommon}
              />
            ) : null
          ) : (
            <>
              <CommonInfoForm
                common={ctrl.state.common}
                patch={ctrl.patchCommon}
                activeDocId={ctrl.state.activeDocId}
                dossierId={ctrl.state.activeDossierId}
              />
              {SpecificForm && (
                <div className="pl-4 border-l-2 border-accent/40">
                  <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2">
                    Phần riêng: {ctrl.activeTemplate.label}
                  </div>
                  <SpecificForm
                    common={ctrl.state.common}
                    specific={ctrl.activeSpecific}
                    patch={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
                    patchCommon={ctrl.patchCommon}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="lg:col-span-6 flex flex-col bg-surface/20 min-h-[700px]">
          {ctrl.activeTemplate.standalone ? (
            <StandaloneDocPreview
              docTitle={ctrl.activeTemplate.label}
              docFilename={ctrl.activeTemplate.id}
              docHtml={ctrl.activeHtml}
              onExportExcel={ctrl.activeTemplate.buildXlsx ? handleExportExcel : undefined}
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
      </div>
    </div>
  );
};
