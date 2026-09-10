import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
  const [openDropdown, setOpenDropdown] = useState(false);

  const activeIndex = Math.max(0, ctrl.visibleDocs.findIndex(d => d.templateId === ctrl.state.activeDocId));
  const currentDoc = ctrl.visibleDocs[activeIndex] || ctrl.visibleDocs[0];
  const currentTpl = currentDoc ? TEMPLATE_BY_ID[currentDoc.templateId] : null;

  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];

  const handleExportExcel = () => {
    if (!ctrl.activeTemplate.buildXlsx) return;
    const bytes = ctrl.activeTemplate.buildXlsx(ctrl.state.common, ctrl.activeSpecific);
    const partyBName = ctrl.state.common.partyB.name.trim();
    const safeName = partyBName ? partyBName.replace(/\s+/g, '_') : 'Bang_Ke';
    const dateStr = ctrl.state.common.contractDate || todayIso();
    downloadBytes(bytes, `Bang_Ke_Thu_Mua_${safeName}_${dateStr}.xlsx`, MIME_XLSX);
  };

  const handlePrevDoc = () => {
    if (activeIndex > 0) {
      ctrl.selectDoc(ctrl.visibleDocs[activeIndex - 1].templateId);
    }
  };

  const handleNextDoc = () => {
    if (activeIndex < ctrl.visibleDocs.length - 1) {
      ctrl.selectDoc(ctrl.visibleDocs[activeIndex + 1].templateId);
    }
  };

  return (
    <div className="space-y-0">
      {/* Sub-header: Bộ chọn Biểu mẫu dạng Dropdown List */}
      <div className="p-3 sm:p-3.5 border-b border-line/60 bg-surface/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[300px] max-w-2xl">
          {/* Nút lùi về biểu mẫu trước */}
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={handlePrevDoc}
            className="p-2 rounded-xl border border-line/70 bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all text-ink-muted hover:text-ink cursor-pointer shrink-0 shadow-2xs"
            title="Biểu mẫu trước (<)"
            aria-label="Biểu mẫu trước"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Ô chọn Dropdown List Biểu mẫu */}
          <div className="relative flex-1">
            <Popover.Root open={openDropdown} onOpenChange={setOpenDropdown}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-line/80 bg-surface hover:border-accent text-xs font-bold transition-all cursor-pointer shadow-2xs text-left group"
                  aria-label="Chọn biểu mẫu"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent font-mono text-[11px] font-bold shrink-0">
                      #{activeIndex + 1}
                    </span>
                    <span className="text-ink truncate font-bold text-xs group-hover:text-accent transition-colors">
                      {currentTpl?.label || 'Chọn biểu mẫu'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-ink-faint font-mono bg-panel px-2 py-0.5 rounded-md border border-line/60">
                      {activeIndex + 1} / {ctrl.visibleDocs.length}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-ink-muted transition-transform duration-150 ${
                        openDropdown ? 'rotate-180 text-accent' : ''
                      }`}
                    />
                  </div>
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  align="start"
                  sideOffset={6}
                  className="z-50 w-[420px] sm:w-[480px] max-w-[95vw] rounded-2xl border border-line/80 bg-panel/95 backdrop-blur-xl shadow-2xl p-2.5 font-app text-xs outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                >
                  <div className="px-2.5 py-2 mb-1.5 border-b border-line/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Danh sách biểu mẫu ({ctrl.visibleDocs.length})
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      Bấm để chuyển văn bản
                    </span>
                  </div>

                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {ctrl.visibleDocs.map((doc, idx) => {
                      const tpl = TEMPLATE_BY_ID[doc.templateId];
                      if (!tpl) return null;
                      const active = ctrl.state.activeDocId === doc.templateId;
                      const excluded = ctrl.isExcluded(doc.templateId);
                      const Icon = tpl.icon;

                      return (
                        <div
                          key={doc.templateId}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl transition-all ${
                            active
                              ? 'bg-accent text-accent-ink font-bold shadow-xs'
                              : excluded
                              ? 'opacity-40 bg-surface/30 text-ink-faint'
                              : 'hover:bg-surface-elevated text-ink cursor-pointer'
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={tpl.label}
                            disabled={excluded}
                            onClick={() => {
                              ctrl.selectDoc(doc.templateId);
                              setOpenDropdown(false);
                            }}
                            className="flex items-center gap-2.5 truncate flex-1 text-left cursor-pointer disabled:cursor-not-allowed"
                          >
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                active
                                  ? 'bg-accent-ink/20 text-accent-ink'
                                  : 'bg-surface border border-line/80 text-ink-muted'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            {Icon && (
                              <Icon
                                size={15}
                                className={active ? 'text-accent-ink' : 'text-accent shrink-0'}
                              />
                            )}
                            <span className="truncate">{tpl.label}</span>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {doc.optional && (
                              <label
                                className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none"
                                onClick={e => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={!excluded}
                                  onChange={() => ctrl.toggleOptional(doc.templateId)}
                                  aria-label={`Bật/tắt ${tpl.label}`}
                                  className="rounded border-line text-accent w-3.5 h-3.5"
                                  title="Bật/tắt giấy tờ tùy chọn"
                                />
                                <span className={active ? 'text-accent-ink/80' : 'text-ink-faint'}>
                                  Tùy chọn
                                </span>
                              </label>
                            )}
                            {active && <Check size={16} className="text-accent-ink shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          {/* Nút tiến sang biểu mẫu tiếp theo */}
          <button
            type="button"
            disabled={activeIndex >= ctrl.visibleDocs.length - 1}
            onClick={handleNextDoc}
            className="p-2 rounded-xl border border-line/70 bg-surface hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all text-ink-muted hover:text-ink cursor-pointer shrink-0 shadow-2xs"
            title="Biểu mẫu tiếp theo (>)"
            aria-label="Biểu mẫu tiếp theo"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Thông tin / Checkbox tài liệu tùy chọn hiện tại */}
        {currentDoc?.optional && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-surface/90 hover:bg-surface px-3 py-1.5 rounded-xl border border-line/80 text-xs font-semibold text-ink-muted hover:text-ink transition-all shadow-2xs">
              <input
                type="checkbox"
                checked={!ctrl.isExcluded(currentDoc.templateId)}
                onChange={() => ctrl.toggleOptional(currentDoc.templateId)}
                aria-label={`Sử dụng ${currentTpl?.label || ''}`}
                className="rounded border-line text-accent focus:ring-accent w-3.5 h-3.5"
              />
              <span className="text-[11px]">Bao gồm biểu mẫu này trong hồ sơ</span>
            </label>
          </div>
        )}
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
