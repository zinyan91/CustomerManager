import type { OfficialDoc, OfficialDocFile, OfficialDocInput } from '../../types/officialDoc';
import { isCategory } from './categories';
import { buildSearchText } from './normalize';

function isDocFile(value: unknown): value is OfficialDocFile {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return (
    (f.kind === 'goc' || f.kind === 'bieu-mau') &&
    typeof f.repoId === 'string' &&
    typeof f.path === 'string' &&
    typeof f.name === 'string'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOfficialDocRow(row: any): OfficialDoc {
  const category = String(row.Category ?? '');
  return {
    id: String(row.Id),
    category: isCategory(category) ? category : 'khac',
    docNumber: row.DocNumber ?? '',
    title: row.Title ?? '',
    issuedDate: row.IssuedDate ?? '',
    effectiveFrom: row.EffectiveFrom ?? '',
    effectiveTo: row.EffectiveTo ?? null,
    // Files là jsonb: không tin hình dạng, bỏ phần tử sai thay vì làm sập cả danh sách
    files: Array.isArray(row.Files) ? row.Files.filter(isDocFile) : [],
    createdAt: row.CreatedAt ?? '',
    updatedAt: row.UpdatedAt ?? '',
  };
}

/** Dòng ghi vào OfficialDocuments. Không gửi OwnerId: DB tự gán auth.uid(). */
export function toOfficialDocRow(input: OfficialDocInput): Record<string, unknown> {
  const docNumber = input.docNumber.trim();
  const title = input.title.trim();
  return {
    Category: input.category,
    DocNumber: docNumber,
    Title: title,
    IssuedDate: input.issuedDate,
    EffectiveFrom: input.effectiveFrom,
    EffectiveTo: input.effectiveTo || null,
    Files: input.files,
    SearchText: buildSearchText(docNumber, title),
    UpdatedAt: new Date().toISOString(),
  };
}
