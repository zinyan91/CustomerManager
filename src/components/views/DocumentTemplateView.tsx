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
      <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-accent font-bold text-xs">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
            <FolderArchive size={15} />
          </div>
          <span className="uppercase tracking-wider text-[11px]">BỘ HỒ SƠ & BIỂU MẪU CHỨNG TỪ PHÁP LÝ</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dossierCtrl.dossiers.map(d => {
            const active = dossierCtrl.activeDossier.id === d.id;
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => dossierCtrl.selectDossier(d.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-accent text-accent-ink border-accent shadow-md shadow-accent/20 ring-2 ring-accent/20'
                    : 'bg-surface hover:bg-surface-elevated text-ink-muted border-line/70 hover:border-accent hover:text-accent shadow-2xs'
                }`}
              >
                <Icon size={14} className={active ? 'text-accent-ink' : 'text-accent'} />
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
