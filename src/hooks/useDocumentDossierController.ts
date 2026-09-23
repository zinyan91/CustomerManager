import { useReducer, useMemo, useCallback } from 'react';
import type { DossierCommon, DocTemplate, Dossier } from '../components/documents/registry/types';
import { TEMPLATE_BY_ID } from '../components/documents/registry/templates';
import { DOSSIERS } from '../components/documents/registry/dossiers';
import { workspaceReducer, initWorkspaceState } from './documentDossierReducer';

export function useDocumentDossierController() {
  const [ws, dispatch] = useReducer(workspaceReducer, DOSSIERS[0].id, initWorkspaceState);
  const state = ws.byDossier[ws.activeDossierId];

  const activeDossier = useMemo<Dossier>(
    () => DOSSIERS.find(d => d.id === state.activeDossierId) ?? DOSSIERS[0],
    [state.activeDossierId],
  );
  const activeTemplate = TEMPLATE_BY_ID[state.activeDocId] as DocTemplate<any>;
  const activeSpecific = state.specificByDocId[state.activeDocId];
  const activeHtml = useMemo(
    () => activeTemplate.buildHtml(state.common, activeSpecific),
    [activeTemplate, state.common, activeSpecific],
  );

  const isExcluded = useCallback(
    (docId: string) => state.excludedDocIds.includes(docId),
    [state.excludedDocIds],
  );

  const isExcludedIn = useCallback(
    (dossierId: string, docId: string) => ws.byDossier[dossierId]?.excludedDocIds.includes(docId) ?? false,
    [ws.byDossier],
  );

  return {
    state,
    dossiers: DOSSIERS,
    activeDossier,
    visibleDocs: activeDossier.documents,
    activeTemplate,
    activeSpecific,
    activeHtml,
    isExcluded,
    isExcludedIn,
    selectDossier: (dossierId: string) => dispatch({ type: 'selectDossier', dossierId }),
    selectDoc: (docId: string) => dispatch({ type: 'selectDoc', docId }),
    selectDocIn: (dossierId: string, docId: string) => dispatch({ type: 'selectDocIn', dossierId, docId }),
    patchCommon: (patch: Partial<DossierCommon>) => dispatch({ type: 'patchCommon', patch }),
    patchSpecific: (docId: string, patch: Record<string, unknown>) =>
      dispatch({ type: 'patchSpecific', docId, patch }),
    toggleOptional: (docId: string) => dispatch({ type: 'toggleOptional', docId }),
    toggleOptionalIn: (dossierId: string, docId: string) => dispatch({ type: 'toggleOptionalIn', dossierId, docId }),
  };
}
