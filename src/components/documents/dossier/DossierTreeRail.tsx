import React, { useMemo } from 'react';
import type { useDocumentDossierController } from '../../../hooks/useDocumentDossierController';
import { TEMPLATE_BY_ID } from '../registry/templates';
import { TreeRail } from '../../common/TreeRail';
import { buildDossierTree, nodeIdOf, parseNodeId } from '../../../lib/documents/dossierTree';

type Ctrl = ReturnType<typeof useDocumentDossierController>;

interface DossierTreeRailProps {
  ctrl: Ctrl;
  onCollapse: () => void;
  onPicked?: () => void;
  className?: string;
}

export const DossierTreeRail: React.FC<DossierTreeRailProps> = ({ ctrl, onCollapse, onPicked, className }) => {
  const nodes = useMemo(
    () => buildDossierTree(ctrl.dossiers, id => TEMPLATE_BY_ID[id]?.label ?? id, ctrl.isExcludedIn),
    [ctrl.dossiers, ctrl.isExcludedIn],
  );
  const labelOfDossier = (id: string) => ctrl.dossiers.find(d => d.id === id)?.label ?? id;

  return (
    <TreeRail
      title="Bộ hồ sơ"
      nodes={nodes}
      selectedId={nodeIdOf(ctrl.state.activeDossierId, ctrl.state.activeDocId)}
      onSelect={id => {
        const p = parseNodeId(id);
        if (!p) return;
        ctrl.selectDocIn(p.dossierId, p.docId);
        onPicked?.();
      }}
      onCollapse={onCollapse}
      className={className}
      renderTrailing={node => {
        if (!node.optional) return null;
        const p = parseNodeId(node.id);
        if (!p) return null;
        return (
          <label className="flex items-center gap-1 px-2 text-[10px] text-ink-faint cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={!ctrl.isExcludedIn(p.dossierId, p.docId)}
              onChange={() => ctrl.toggleOptionalIn(p.dossierId, p.docId)}
              aria-label={`Gồm ${node.label} (${labelOfDossier(p.dossierId)})`}
              className="rounded border-line w-3 h-3"
            />
            gồm
          </label>
        );
      }}
    />
  );
};
