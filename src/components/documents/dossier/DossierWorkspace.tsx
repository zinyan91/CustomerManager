import React, { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronLeft, ChevronRight, Check, Layers } from 'lucide-react';
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
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const activeIndex = Math.max(0, ctrl.visibleDocs.findIndex(d => d.templateId === ctrl.state.activeDocId));
  const currentDoc = ctrl.visibleDocs[activeIndex] || ctrl.visibleDocs[0];
  const currentTpl = currentDoc ? TEMPLATE_BY_ID[currentDoc.templateId] : null;

  const SpecificForm = SPECIFIC_FORM_BY_ID[ctrl.state.activeDocId];

  useEffect(() => {
    if (typeof activeTabRef.current?.scrollIntoView === 'function') {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [ctrl.state.activeDocId]);

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
      {/* Sub-header: Thanh điều hướng biểu mẫu trực quan, chống tràn, chuẩn mực văn bản */}
      <div className="p-2 sm:p-2.5 border-b border-line/60 bg-surface/40 flex items-center justify-between gap-2 overflow-hidden">
        {/* Nút lùi về biểu mẫu trước */}
        <button
          type="button"
          disabled={activeIndex <= 0}
          onClick={handlePrevDoc}
          className="p-1.5 sm:p-2 rounded-lg border border-line/70 bg-surface hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all text-ink-muted hover:text-ink cursor-pointer shrink-0 shadow-2xs"
          title="Biểu mẫu trước (<)"
          aria-label="Biểu mẫu trước"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Tab Strip cuộn ngang mượt mà cho tất cả biểu mẫu */}
        <div
          ref={tabsContainerRef}
          role="tablist"
          aria-label="Danh sách biểu mẫu trong hồ sơ"
          className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {ctrl.visibleDocs.map(doc => {
            const tpl = TEMPLATE_BY_ID[doc.templateId];
            if (!tpl) return null;
            const active = ctrl.state.activeDocId === doc.templateId;
            const excluded = ctrl.isExcluded(doc.templateId);

            return (
              <button
                key={doc.templateId}
                role="tab"
                type="button"
                ref={active ? activeTabRef : undefined}
                aria-selected={active}
                aria-label={tpl.label}
                disabled={excluded}
                onClick={() => ctrl.selectDoc(doc.templateId)}
                className={`group px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-panel text-ink border-line/90 shadow-2xs font-bold'
                    : excluded
                    ? 'opacity-40 line-through bg-surface/30 text-ink-faint border-dashed border-line/50 cursor-not-allowed'
                    : 'bg-surface/50 hover:bg-surface-elevated text-ink-muted hover:text-ink border-transparent hover:border-line/60'
                }`}
              >
                <span>{tpl.label}</span>
                {doc.optional && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-surface/80 border border-line/60 text-ink-faint font-normal">
                    Tùy chọn
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút tiến sang biểu mẫu tiếp theo */}
        <button
          type="button"
          disabled={activeIndex >= ctrl.visibleDocs.length - 1}
          onClick={handleNextDoc}
          className="p-1.5 sm:p-2 rounded-lg border border-line/70 bg-surface hover:bg-surface-elevated disabled:opacity-25 disabled:cursor-not-allowed transition-all text-ink-muted hover:text-ink cursor-pointer shrink-0 shadow-2xs"
          title="Biểu mẫu tiếp theo (>)"
          aria-label="Biểu mẫu tiếp theo"
        >
          <ChevronRight size={15} />
        </button>

        {/* Divider */}
        <div className="h-5 w-[1px] bg-line/60 mx-0.5 shrink-0 hidden sm:block" />

        {/* Checkbox tài liệu tùy chọn hiện tại */}
        {currentDoc?.optional && (
          <label className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line/70 bg-surface hover:bg-surface-elevated text-xs text-ink-muted hover:text-ink cursor-pointer select-none shrink-0 shadow-2xs">
            <input
              type="checkbox"
              checked={!ctrl.isExcluded(currentDoc.templateId)}
              onChange={() => ctrl.toggleOptional(currentDoc.templateId)}
              aria-label={`Sử dụng ${currentTpl?.label || ''}`}
              className="rounded border-line text-ink focus:ring-line w-3.5 h-3.5"
            />
            <span className="text-[11px] font-medium">Bao gồm</span>
          </label>
        )}

        {/* Nút Danh Mục Biểu Mẫu (All Documents Popover) */}
        <Popover.Root open={openDropdown} onOpenChange={setOpenDropdown}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line/70 bg-surface hover:bg-surface-elevated text-xs font-semibold text-ink-muted hover:text-ink transition-all cursor-pointer shadow-2xs shrink-0"
              aria-label="Chọn biểu mẫu"
              title="Xem toàn bộ danh mục biểu mẫu trong hồ sơ"
            >
              <Layers size={14} className="text-ink-muted shrink-0" />
              <span className="hidden sm:inline text-ink text-xs font-semibold">Danh mục</span>
              <span className="text-[11px] text-ink-faint font-mono bg-panel px-1.5 py-0.5 rounded border border-line/60">
                {activeIndex + 1}/{ctrl.visibleDocs.length}
              </span>
              <ChevronDown
                size={14}
                className={`text-ink-muted transition-transform duration-150 ${
                  openDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={6}
              className="z-50 w-[380px] sm:w-[440px] max-w-[95vw] rounded-2xl border border-line/80 bg-panel/95 backdrop-blur-xl shadow-2xl p-2.5 font-app text-xs outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
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
                {ctrl.visibleDocs.map(doc => {
                  const tpl = TEMPLATE_BY_ID[doc.templateId];
                  if (!tpl) return null;
                  const active = ctrl.state.activeDocId === doc.templateId;
                  const excluded = ctrl.isExcluded(doc.templateId);

                  return (
                    <div
                      key={doc.templateId}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-all ${
                        active
                          ? 'bg-surface-elevated text-ink font-bold border border-line/80 shadow-2xs'
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
                        className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer disabled:cursor-not-allowed py-0.5"
                      >
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
                              className="rounded border-line text-ink w-3.5 h-3.5"
                              title="Bật/tắt giấy tờ tùy chọn"
                            />
                            <span className={active ? 'text-ink' : 'text-ink-faint'}>
                              Tùy chọn
                            </span>
                          </label>
                        )}
                        {active && <Check size={15} className="text-ink shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
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
