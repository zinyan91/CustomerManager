import React, { useState } from 'react';
import { ChevronLeft, FileText, Folder, PanelLeftClose } from 'lucide-react';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { TEMPLATE_BY_ID } from '../registry/templates';

type Ctrl = ReturnType<typeof useDocumentDossierController>;

interface DossierTreeRailProps {
  ctrl: Ctrl;
  onCollapse: () => void;
  onPicked?: () => void;
  className?: string;
}

const ROW = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-menu text-left transition-colors cursor-pointer';

export const DossierTreeRail: React.FC<DossierTreeRailProps> = ({ ctrl, onCollapse, onPicked, className = '' }) => {
  const [openId, setOpenId] = useState<string | null>(ctrl.state.activeDossierId);
  const open = ctrl.dossiers.find(d => d.id === openId) ?? null;
  const activeDossierId = ctrl.state.activeDossierId;
  const activeDocId = ctrl.state.activeDocId;

  return (
    <nav aria-label="Bộ hồ sơ" className={`flex flex-col bg-panel text-ink ${className}`}>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-b border-line/60">
        {open ? (
          <button
            type="button"
            onClick={() => setOpenId(null)}
            aria-label="Về danh sách bộ hồ sơ"
            className="flex items-center gap-1 min-w-0 px-1 py-1 rounded text-[11px] font-bold uppercase tracking-wide text-ink-faint hover:text-ink cursor-pointer"
          >
            <ChevronLeft size={14} className="shrink-0" aria-hidden />
            <span className="truncate">Bộ hồ sơ</span>
          </button>
        ) : (
          <span className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Bộ hồ sơ</span>
        )}
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Ẩn Bộ hồ sơ"
          title="Ẩn Bộ hồ sơ"
          className="p-1 rounded text-ink-muted hover:text-ink hover:bg-panel-muted/60 cursor-pointer"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {open ? (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          <div className="flex items-center gap-2 px-2.5 pt-1 pb-2 text-menu font-bold text-ink">
            <Folder size={16} className="shrink-0 text-accent" aria-hidden />
            <span className="truncate" title={open.label}>{open.label}</span>
          </div>
          <ul className="space-y-0.5">
            {open.documents.map(doc => {
              const label = TEMPLATE_BY_ID[doc.templateId]?.label ?? doc.templateId;
              const excluded = ctrl.isExcludedIn(open.id, doc.templateId);
              const selected = open.id === activeDossierId && doc.templateId === activeDocId;
              return (
                <li key={doc.templateId} className="flex items-center">
                  <button
                    type="button"
                    disabled={excluded}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => { ctrl.selectDocIn(open.id, doc.templateId); onPicked?.(); }}
                    title={label}
                    className={`${ROW} min-w-0 flex-1 ${
                      selected
                        ? 'bg-accent-soft text-accent font-semibold'
                        : excluded
                        ? 'text-ink-faint line-through opacity-50 cursor-not-allowed'
                        : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'
                    }`}
                  >
                    <FileText size={15} className="shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </button>
                  {doc.optional && (
                    <label className="flex items-center gap-1 px-2 text-[10px] text-ink-faint cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => ctrl.toggleOptionalIn(open.id, doc.templateId)}
                        aria-label={`Gồm ${label} (${open.label})`}
                        className="rounded border-line w-3 h-3"
                      />
                      gồm
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {ctrl.dossiers.map(d => (
            <li key={d.id}>
              <button
                type="button"
                aria-label={d.label}
                onClick={() => setOpenId(d.id)}
                className={`${ROW} ${d.id === activeDossierId ? 'bg-accent-soft/60 text-ink font-semibold' : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'}`}
              >
                <Folder size={16} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span className="shrink-0 text-[10px] font-mono text-ink-faint">{d.documents.length}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};
