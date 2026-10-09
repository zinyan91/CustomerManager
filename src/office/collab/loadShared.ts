import type { WorkbookData } from '../calc/model/workbook';
import { getSharedDocument, listOps, type SharedDocument } from './collabApi';
import { SyncEngine } from './sync';

export interface LoadedShared {
  doc: SharedDocument;
  /** Bản hiện hành: bản chụp cộng các thao tác sau đó. */
  data: WorkbookData;
  /** Số thứ tự của bản hiện hành. */
  seq: number;
}

/** Mở bảng tính chung: tải bản chụp rồi phát lại các thao tác sau nó để ra bản hiện hành. */
export async function loadSharedWorkbook(id: string): Promise<LoadedShared> {
  const doc = await getSharedDocument(id);
  const engine = new SyncEngine(doc.data, doc.snapSeq, 'loader');
  for (;;) {
    const before = engine.seq;
    const ops = await listOps(id, before);
    for (const op of ops) engine.receive(op);
    if (ops.length === 0 || engine.seq === before) break;
  }
  return { doc, data: engine.local, seq: engine.seq };
}
