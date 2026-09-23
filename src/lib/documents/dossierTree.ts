import type { ComponentType } from 'react';
import type { TreeNode } from '../tree/treeNodes';

export interface DossierLike {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  documents: Array<{ templateId: string; optional?: boolean }>;
}

export const nodeIdOf = (dossierId: string, docId: string) => `${dossierId}/${docId}`;

export function parseNodeId(id: string): { dossierId: string; docId: string } | null {
  const i = id.indexOf('/');
  if (i <= 0 || i === id.length - 1) return null;
  return { dossierId: id.slice(0, i), docId: id.slice(i + 1) };
}

export function buildDossierTree(
  dossiers: DossierLike[],
  labelOf: (docId: string) => string,
  isExcludedIn: (dossierId: string, docId: string) => boolean,
): TreeNode[] {
  return dossiers.map(d => ({
    id: d.id,
    label: d.label,
    icon: d.icon,
    children: d.documents.map(doc => ({
      id: nodeIdOf(d.id, doc.templateId),
      label: labelOf(doc.templateId),
      optional: doc.optional === true,
      disabled: isExcludedIn(d.id, doc.templateId),
    })),
  }));
}
