import type { DossierCommon } from '../components/documents/registry/types';
import { emptyCommon } from '../components/documents/registry/types';
import { TEMPLATE_BY_ID } from '../components/documents/registry/templates';
import { DOSSIERS } from '../components/documents/registry/dossiers';

export interface DossierState {
  activeDossierId: string;
  activeDocId: string;
  common: DossierCommon;
  specificByDocId: Record<string, unknown>;
  excludedDocIds: string[];
}

export type DossierAction =
  | { type: 'selectDossier'; dossierId: string }
  | { type: 'selectDoc'; docId: string }
  | { type: 'patchCommon'; patch: Partial<DossierCommon> }
  | { type: 'patchSpecific'; docId: string; patch: Record<string, unknown> }
  | { type: 'toggleOptional'; docId: string };

function dossierById(id: string) {
  const d = DOSSIERS.find(x => x.id === id);
  if (!d) throw new Error(`Unknown dossier: ${id}`);
  return d;
}

export function initDossierState(dossierId: string): DossierState {
  const dossier = dossierById(dossierId);
  const common = { ...emptyCommon(), ...(dossier.commonDefaults ?? {}) };
  const specificByDocId: Record<string, unknown> = {};
  for (const doc of dossier.documents) {
    const tpl = TEMPLATE_BY_ID[doc.templateId];
    specificByDocId[doc.templateId] = structuredClone(tpl.specificDefaults);
  }
  return {
    activeDossierId: dossierId,
    activeDocId: dossier.documents[0].templateId,
    common,
    specificByDocId,
    excludedDocIds: [],
  };
}

export function dossierReducer(state: DossierState, action: DossierAction): DossierState {
  switch (action.type) {
    case 'selectDossier':
      return initDossierState(action.dossierId);
    case 'selectDoc':
      return { ...state, activeDocId: action.docId };
    case 'patchCommon':
      return { ...state, common: { ...state.common, ...action.patch } };
    case 'patchSpecific':
      return {
        ...state,
        specificByDocId: {
          ...state.specificByDocId,
          [action.docId]: { ...(state.specificByDocId[action.docId] as object), ...action.patch },
        },
      };
    case 'toggleOptional': {
      const has = state.excludedDocIds.includes(action.docId);
      return {
        ...state,
        excludedDocIds: has
          ? state.excludedDocIds.filter(id => id !== action.docId)
          : [...state.excludedDocIds, action.docId],
      };
    }
    default:
      return state;
  }
}
