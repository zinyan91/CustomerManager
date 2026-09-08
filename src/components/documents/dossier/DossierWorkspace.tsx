import React from 'react';
import type { UiClasses } from '../../../lib/uiClasses';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { TEMPLATE_BY_ID } from '../registry/templates';
import { CommonInfoForm } from './CommonInfoForm';
import { SPECIFIC_FORM_BY_ID } from './specificForms';
import { DocumentPreview } from '../DocumentPreview';
import { StandaloneDocPreview } from './StandaloneDocPreview';
import { downloadBytes } from '../../../lib/xlsExport';
import { MIME_XLSX } from '../../../lib/xlsxWriter';
import { todayIso } from '../../../lib/utils';

export const DossierWorkspace: React.FC<{
  styles: UiClasses;
  ctrl: ReturnType<typeof useDocumentDossierController>;
}> = ({ styles, ctrl }) => {
  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];

  const handleExportExcel = () => {
    if (!ctrl.activeTemplate.buildXlsx) return;
    const bytes = ctrl.activeTemplate.buildXlsx(ctrl.state.common, ctrl.activeSpecific);
    const partyBName = ctrl.state.common.partyB.name.trim();
    const safeName = partyBName ? partyBName.replace(/\s+/g, '_') : 'Bang_Ke';
    const dateStr = ctrl.state.common.contractDate || todayIso();
    downloadBytes(bytes, `Bang_Ke_Thu_Mua_${safeName}_${dateStr}.xlsx`, MIME_XLSX);
  };
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
                  aria-label={`Bật/tắt ${tpl.label}`}
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
