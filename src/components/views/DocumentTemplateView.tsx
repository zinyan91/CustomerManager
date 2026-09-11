import React from 'react';
import { UI } from '../../lib/uiClasses';
import { FolderArchive } from 'lucide-react';
import { useDocumentDossierController } from '../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../documents/dossier/DossierWorkspace';

export const DocumentTemplateView: React.FC = () => {
  const styles = UI;
  const dossierCtrl = useDocumentDossierController();

  return (
    <div className="rounded-2xl border border-line/70 bg-panel/90 shadow-sm overflow-hidden text-xs font-app animate-in fade-in duration-150">
      {/* Header chọn Folder / Bộ hồ sơ */}
      <div className="p-3 sm:p-3.5 border-b border-line/60 bg-surface/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 text-ink font-bold text-xs">
          <div className="p-1.5 rounded-lg bg-surface-elevated border border-line/70 text-ink">
            <FolderArchive size={15} />
          </div>
          <span className="uppercase tracking-wider text-[11px] text-ink font-bold">BỘ HỒ SƠ & BIỂU MẪU CHỨNG TỪ PHÁP LÝ</span>
        </div>

        <div className="flex items-center gap-1 bg-surface/80 p-1 rounded-xl border border-line/70 overflow-x-auto no-scrollbar max-w-full">
          {dossierCtrl.dossiers.map(d => {
            const active = dossierCtrl.activeDossier.id === d.id;
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => dossierCtrl.selectDossier(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-panel text-ink border-line/90 shadow-2xs font-bold'
                    : 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-elevated/70 border-transparent'
                }`}
              >
                <Icon size={14} className={active ? 'text-ink' : 'text-ink-muted'} />
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Không gian làm việc theo bộ hồ sơ (Dossier Workspace) */}
      <DossierWorkspace styles={styles} ctrl={dossierCtrl} />
    </div>
  );
};
