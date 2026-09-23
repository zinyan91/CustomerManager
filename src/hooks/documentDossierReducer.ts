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
      const excludedDocIds = has
        ? state.excludedDocIds.filter(id => id !== action.docId)
        : [...state.excludedDocIds, action.docId];
      let activeDocId = state.activeDocId;
      const nowExcluded = !has;
      if (nowExcluded && action.docId === state.activeDocId) {
        const dossier = dossierById(state.activeDossierId);
        const firstIncluded = dossier.documents.find(
          doc => !excludedDocIds.includes(doc.templateId),
        );
        if (firstIncluded) activeDocId = firstIncluded.templateId;
      }
      return { ...state, excludedDocIds, activeDocId };
    }
    default:
      return state;
  }
}

export interface DossierWorkspaceState {
  activeDossierId: string;
  byDossier: Record<string, DossierState>;
}

export type WorkspaceAction =
  | DossierAction
  | { type: 'selectDossier'; dossierId: string }
  | { type: 'selectDocIn'; dossierId: string; docId: string }
  | { type: 'toggleOptionalIn'; dossierId: string; docId: string };

export function initWorkspaceState(dossierId: string): DossierWorkspaceState {
  return { activeDossierId: dossierId, byDossier: { [dossierId]: initDossierState(dossierId) } };
}

function withDossier(state: DossierWorkspaceState, dossierId: string, action?: DossierAction): DossierWorkspaceState {
  const current = state.byDossier[dossierId] ?? initDossierState(dossierId);
  const next = action ? dossierReducer(current, action) : current;
  return { ...state, byDossier: { ...state.byDossier, [dossierId]: next } };
}

export function workspaceReducer(state: DossierWorkspaceState, action: WorkspaceAction): DossierWorkspaceState {
  switch (action.type) {
    case 'selectDossier':
      return { ...withDossier(state, action.dossierId), activeDossierId: action.dossierId };
    case 'selectDocIn':
      return {
        ...withDossier(state, action.dossierId, { type: 'selectDoc', docId: action.docId }),
        activeDossierId: action.dossierId,
      };
    case 'toggleOptionalIn':
      return withDossier(state, action.dossierId, { type: 'toggleOptional', docId: action.docId });
    default:
      return withDossier(state, state.activeDossierId, action);
  }
}
