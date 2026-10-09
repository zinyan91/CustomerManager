import { parseDocJson, type DocNode } from './docJson';
import { parsePageSetup, type PageSetup } from './pageSetup';

/** Nội dung văn bản chung trên hệ thống: cả cây tài liệu và thiết lập trang, lưu thành một khối. */
export interface SharedContent {
  doc: DocNode;
  pageSetup: PageSetup;
}

export const toSharedContent = (doc: DocNode, pageSetup: PageSetup): SharedContent => ({ doc, pageSetup });

/** Đọc lại nội dung đã lưu; thiếu hay hỏng phần nào thì dùng văn bản trống hoặc thiết lập trang mặc định cho phần đó. */
export function parseSharedContent(value: unknown): SharedContent {
  const raw = (value && typeof value === 'object' ? value : {}) as { doc?: unknown; pageSetup?: unknown };
  return { doc: parseDocJson(raw.doc), pageSetup: parsePageSetup(raw.pageSetup) };
}
