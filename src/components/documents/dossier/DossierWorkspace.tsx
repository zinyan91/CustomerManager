import React from 'react';
import type { UiClasses } from '../../../lib/uiClasses';
import { DOSSIERS } from '../registry/dossiers';
import { TEMPLATE_BY_ID } from '../registry/templates';
import { SPECIFIC_FORM_BY_ID } from './specificForms';
import { CommonInfoForm } from './CommonInfoForm';
import { DocumentPreview } from '../DocumentPreview';
import { StandaloneDocPreview } from './StandaloneDocPreview';
import { useDossierWorkspace } from '../../../hooks/useDossierWorkspace';
import { downloadBytes } from '../../../lib/xlsExport';
import { MIME_XLSX } from '../../../lib/xlsxWriter';

interface DossierWorkspaceProps {
  styles: UiClasses;
}

export const DossierWorkspace: React.FC<DossierWorkspaceProps> = ({ styles }) => {
  const ctrl = useDossierWorkspace();
  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];

  const handleExportExcel = () => {
    if (!ctrl.activeTemplate.buildXlsx) return;
    const bytes = ctrl.activeTemplate.buildXlsx(ctrl.state.common, ctrl.activeSpecific);
    downloadBytes(bytes, `${ctrl.activeTemplate.id}.xlsx`, MIME_XLSX);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 pb-3">
        {ctrl.activeDossier.documents.map(d => {
          const tpl = TEMPLATE_BY_ID[d.templateId];
          if (!tpl) return null;
          const active = d.templateId === ctrl.state.activeDocId;
          const excluded = ctrl.state.excludedDocIds.includes(d.templateId);
          return (
            <div key={d.templateId} className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => ctrl.selectDoc(d.templateId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
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
          {ctrl.state.activeDossierId === 'van_hanh_tap_trung' ? (
            SpecificForm ? (
              <SpecificForm
                common={ctrl.state.common}
                specific={ctrl.activeSpecific}
                patch={(p: Record<string, unknown>) => ctrl.patchSpecific(ctrl.state.activeDocId, p)}
              />
            ) : null
          ) : (
            <>
              <CommonInfoForm
                common={ctrl.state.common}
                patch={ctrl.patchCommon}
                activeDocId={ctrl.state.activeDocId}
                activeSpecific={ctrl.activeSpecific}
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
