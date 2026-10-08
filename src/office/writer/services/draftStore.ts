import { parseDriveLink, type DriveLink } from '../../shared/archive/officeArchive';
import { newDraftId, openIdbStore, type DraftSummary } from '../../shared/idbStore';
import { parseDocJson, type DocNode } from '../utils/docJson';
import { parsePageSetup, type PageSetup } from '../utils/pageSetup';

/**
 * Drafts, kept in this browser's IndexedDB: Writer saves the open document
 * here a moment after each change, and the home screen lists them as recent
 * documents. Nothing leaves the device; clearing site data removes them.
 */
export interface Draft {
  id: string;
  title: string;
  doc: DocNode;
  pageSetup: PageSetup;
  /** Milliseconds since the epoch. */
  updatedAt: number;
  /** Tệp trong Kho lưu trữ mà văn bản này đã được lưu vào hoặc mở ra từ đó. */
  driveLink?: DriveLink;
}

export type { DraftSummary };
export { newDraftId };

const store = openIdbStore('felix-office', 'writer-drafts');

function toDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Draft>;
  if (typeof raw.id !== 'string') return null;
  const driveLink = parseDriveLink(raw.driveLink);
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : '',
    doc: parseDocJson(raw.doc),
    pageSetup: parsePageSetup(raw.pageSetup),
    updatedAt: Number(raw.updatedAt) || 0,
    ...(driveLink ? { driveLink } : {}),
  };
}

export async function getDraft(id: string): Promise<Draft | null> {
  return toDraft(await store.get(id));
}

export async function saveDraft(draft: Draft): Promise<void> {
  await store.put(draft);
}

export async function deleteDraft(id: string): Promise<void> {
  await store.delete(id);
}

/** Most recently edited first. */
export async function listDrafts(): Promise<DraftSummary[]> {
  return (await store.getAll())
    .map(toDraft)
    .filter((draft): draft is Draft => draft !== null)
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
