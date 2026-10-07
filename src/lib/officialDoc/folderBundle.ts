import { isSupportedAiAttachmentFile } from '../ai/fileToAttachment';
import type { UploadItem } from '../uploadItems';
import { normalizeSearch } from './normalize';

/**
 * Một thư mục văn thư: một văn bản chính cùng các phụ lục. `main` là PDF hoặc ảnh để AI đọc;
 * `appendices` là các PDF hoặc ảnh còn lại, chỉ được lưu và liệt kê (AI không đọc);
 * `others` là Word, Excel, ZIP... đi kèm như biểu mẫu.
 */
export interface FolderBundle {
  name: string;
  main: File;
  appendices: File[];
  others: File[];
}

// PL1 - ..., BM - ..., Phụ lục 2, Biểu mẫu 01: tên tệp phụ của văn bản chứ không phải văn bản chính
const APPENDIX_NAME = /^(pl|bm|phu\s*luc|bieu\s*mau)(\s+so)?\s*\d*\s*([-–_.:)]|\s|$)/;
// Số hiệu kiểu 2097-2026 hoặc 2097/2026 trong tên tệp
const DOC_NUMBER_IN_NAME = /\d{1,5}\s*[-/_]\s*\d{4}/;

const withoutExtension = (fileName: string) => fileName.replace(/\.[^./\\]+$/, '');

export function isAppendixName(fileName: string): boolean {
  return APPENDIX_NAME.test(normalizeSearch(withoutExtension(fileName)));
}

const byName = (a: File, b: File) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });

/** Tệp chính: bỏ các tệp tên phụ lục, ưu tiên tên có số hiệu, rồi tên ngắn nhất. Chỉ còn tệp phụ lục thì chọn trong số đó. */
export function pickMainFile(candidates: readonly File[]): File | null {
  if (candidates.length === 0) return null;
  const mains = candidates.filter((f) => !isAppendixName(f.name));
  const pool = mains.length > 0 ? mains : [...candidates];
  const score = (f: File) => (DOC_NUMBER_IN_NAME.test(normalizeSearch(f.name)) ? 0 : 1);
  return [...pool].sort((a, b) => score(a) - score(b) || a.name.length - b.name.length || byName(a, b))[0];
}

/** Các tệp PDF hoặc ảnh trong thư mục, AI đọc được. */
export const readableFiles = (files: readonly File[]): File[] => files.filter(isSupportedAiAttachmentFile);

/**
 * Gom tệp của một thư mục thành một văn bản. `main` chỉ định tệp chính (người dùng đổi); không có hoặc không
 * thuộc thư mục thì tự chọn. Không có PDF hay ảnh nào thì null, vì không có gì để AI đọc.
 */
export function planFolderBundle(name: string, files: readonly File[], main?: File): FolderBundle | null {
  const readable = readableFiles(files);
  const chosen = main && readable.includes(main) ? main : pickMainFile(readable);
  if (!chosen) return null;
  return {
    name,
    main: chosen,
    appendices: readable.filter((f) => f !== chosen).sort(byName),
    others: files.filter((f) => !readable.includes(f)),
  };
}

export interface DroppedFolder {
  name: string;
  files: File[];
}

/** Tách tệp thả vào thành các thư mục (theo đoạn đường dẫn đầu tiên, gồm cả thư mục con) và tệp rời. */
export function splitDroppedItems(items: readonly UploadItem[]): { folders: DroppedFolder[]; loose: File[] } {
  const folders = new Map<string, File[]>();
  const loose: File[] = [];
  for (const { file, relativePath } of items) {
    const slash = relativePath.indexOf('/');
    if (slash < 0) {
      loose.push(file);
      continue;
    }
    const name = relativePath.slice(0, slash);
    folders.set(name, [...(folders.get(name) ?? []), file]);
  }
  return { folders: [...folders].map(([name, files]) => ({ name, files })), loose };
}
