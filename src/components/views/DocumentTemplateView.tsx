import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UI } from '../../lib/uiClasses';
import { FolderArchive, PanelLeftOpen } from 'lucide-react';
import { useDocumentDossierController } from '../../hooks/useDocumentDossierController';
import { usePersistedFlag } from '../../hooks/usePersistedFlag';
import { DossierWorkspace } from '../documents/dossier/DossierWorkspace';
import { DossierTreeRail } from '../documents/dossier/DossierTreeRail';

const isWide = () => typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 1024px)').matches;

export const DocumentTemplateView: React.FC = () => {
  const styles = UI;
  const dossierCtrl = useDocumentDossierController();
  const [collapsed, setCollapsed] = usePersistedFlag('cm_doc_tree_collapsed', false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const openTree = () => {
    if (isWide()) setCollapsed(false);
    else setDrawerOpen(true);
  };

  return (
    <div className="rounded-2xl border border-line/70 bg-panel/90 shadow-sm overflow-hidden text-xs font-app animate-in fade-in duration-150">
      <div className="p-3 sm:p-3.5 border-b border-line/60 bg-surface/50 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-surface-elevated border border-line/70 text-ink">
          <FolderArchive size={15} />
        </div>
        <span className="uppercase tracking-wider text-[11px] text-ink font-bold">BỘ HỒ SƠ & BIỂU MẪU CHỨNG TỪ PHÁP LÝ</span>
      </div>

      <div className="flex">
        {drawerOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
            <DossierTreeRail
              ctrl={dossierCtrl}
              onCollapse={() => setDrawerOpen(false)}
              onPicked={() => setDrawerOpen(false)}
              className="fixed inset-y-0 left-0 z-[61] w-72 max-w-[85vw] shadow-xl font-app"
            />
          </>,
          document.body,
        )}
        {!collapsed && !drawerOpen && (
          <DossierTreeRail
            ctrl={dossierCtrl}
            onCollapse={() => setCollapsed(true)}
            className="hidden lg:flex w-60 shrink-0 border-r border-line/60"
          />
        )}
        <div className="flex-1 min-w-0">
          <DossierWorkspace
            styles={styles}
            ctrl={dossierCtrl}
            leading={(
              <button
                type="button"
                onClick={openTree}
                aria-label="Hiện cây hồ sơ"
                title="Hiện cây hồ sơ"
                className={`p-1.5 sm:p-2 rounded-lg border border-line/70 bg-surface hover:bg-surface-elevated text-ink-muted hover:text-ink shrink-0 cursor-pointer ${collapsed ? '' : 'lg:hidden'}`}
              >
                <PanelLeftOpen size={15} />
              </button>
            )}
          />
        </div>
      </div>
    </div>
  );
};
