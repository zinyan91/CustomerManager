import { newDraftId, openIdbStore, type DraftSummary } from '../../shared/idbStore';
import type { WorkbookData } from '../model/workbook';

/** A spreadsheet kept in this browser: autosaved as it changes, listed as a recent document. */
export interface CalcDraft {
  id: string;
  title: string;
  data: WorkbookData;
  updatedAt: number;
}

const store = openIdbStore('felix-office-calc', 'calc-drafts');

export { newDraftId };

function toDraft(value: unknown): CalcDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<CalcDraft>;
  if (typeof raw.id !== 'string' || !raw.data || !Array.isArray(raw.data.sheets)) return null;
  return { id: raw.id, title: typeof raw.title === 'string' ? raw.title : '', data: raw.data, updatedAt: Number(raw.updatedAt) || 0 };
}

export async function getCalcDraft(id: string): Promise<CalcDraft | null> {
  return toDraft(await store.get(id));
}

export async function saveCalcDraft(draft: CalcDraft): Promise<void> {
  await store.put(draft);
}

export async function deleteCalcDraft(id: string): Promise<void> {
  await store.delete(id);
}

export async function listCalcDrafts(): Promise<DraftSummary[]> {
  return (await store.getAll())
    .map(toDraft)
    .filter((d): d is CalcDraft => d !== null)
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
