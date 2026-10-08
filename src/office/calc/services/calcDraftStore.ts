import { newDraftId, openIdbStore, type DraftSummary } from '../../shared/idbStore';
import { parseDriveLink, type DriveLink } from '../../shared/archive/officeArchive';
import type { WorkbookData } from '../model/workbook';

/** A spreadsheet kept in this browser: autosaved as it changes, listed as a recent document. */
export interface CalcDraft {
  id: string;
  title: string;
  data: WorkbookData;
  updatedAt: number;
  /** Tệp trong Kho lưu trữ mà bảng tính này đã được lưu vào hoặc mở ra từ đó. */
  driveLink?: DriveLink;
}

const store = openIdbStore('felix-office-calc', 'calc-drafts');

export { newDraftId };

function toDraft(value: unknown): CalcDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<CalcDraft>;
  if (typeof raw.id !== 'string' || !raw.data || !Array.isArray(raw.data.sheets)) return null;
  const driveLink = parseDriveLink(raw.driveLink);
  return { id: raw.id, title: typeof raw.title === 'string' ? raw.title : '', data: raw.data, updatedAt: Number(raw.updatedAt) || 0, ...(driveLink ? { driveLink } : {}) };
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
