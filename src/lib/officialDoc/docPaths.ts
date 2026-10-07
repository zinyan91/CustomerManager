import { normalizeSearch } from './normalize';

/** Số hiệu thành tên thư mục an toàn: 2753/2026/TB-BĐH thành 2753-2026-tb-bdh. */
export function docFolderSlug(docNumber: string): string {
  return normalizeSearch(docNumber).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'khong-so';
}

/** Tên tệp chưa trùng: a.pdf trùng thì a-2.pdf, a-3.pdf. Tránh ghi đè tệp có sẵn trong Kho. */
export function uniqueFileName(name: string, existing: Set<string>): string {
  if (!existing.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}${ext}`;
    if (!existing.has(candidate)) return candidate;
  }
}
