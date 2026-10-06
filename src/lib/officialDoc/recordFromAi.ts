import type { AiAttachment } from '../../types/ai';
import type { StorageRepo } from '../../types/storageRepo';
import type { ExtractedDoc } from '../ai/docExtract';
import { saveOfficialDoc } from '../api/officialDocApi';
import { listStorageRepos } from '../api/storageReposApi';
import { joinArchivePath } from '../archivePath';
import { HfApiError, listHfTree } from '../huggingface/hfClient';
import { fetchHfAuth } from '../huggingface/hfConfigApi';
import { uploadItemsToHf } from '../huggingface/hfWrite';
import { normalizeSearch } from './normalize';
import { validateOfficialDoc } from './validate';

/** Chuỗi base64 của AiAttachment về lại tệp để tải lên Kho. */
export function attachmentToFile(att: Pick<AiAttachment, 'name' | 'mimeType' | 'base64Data'>): File {
  const binary = atob(att.base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], att.name, { type: att.mimeType });
}

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

export interface RecordTarget {
  repo: StorageRepo;
  token: string;
}

/** Kho Văn thư và token dùng chung. Ném lỗi tiếng Việt khi thiếu. */
export async function resolveRecordTarget(): Promise<RecordTarget> {
  const [repos, auth] = await Promise.all([listStorageRepos(), fetchHfAuth()]);
  const repo = repos.find((r) => r.kind === 'dispatch');
  if (!repo) throw new Error('Chưa có kho Văn thư. Liên hệ Master Admin để tạo kho Văn thư.');
  if (!auth) throw new Error('Chưa cấu hình token Hugging Face. Liên hệ Master Admin để cấu hình.');
  return { repo, token: auth.token };
}

async function existingFileNames(target: RecordTarget, folder: string): Promise<Set<string>> {
  try {
    const tree = await listHfTree(target.repo.repoId, folder, target.token, false);
    return new Set(tree.filter((i) => i.type === 'file').map((i) => i.name));
  } catch (err) {
    // Thư mục chưa có thì chưa có tệp nào để trùng
    if (err instanceof HfApiError && err.status === 404) return new Set();
    throw err;
  }
}

/**
 * Tải tệp lên kho Văn thư (<gốc>/<mục>/<năm>/<số hiệu>/) rồi ghi văn bản với tệp là bản gốc.
 * Kiểm tra dữ liệu trước khi tải để không để lại tệp mồ côi vì thiếu trường.
 */
export async function recordDocFromFile(args: { file: File; fields: ExtractedDoc; target: RecordTarget }) {
  const { file, fields, target } = args;
  const invalid = validateOfficialDoc({ ...fields, files: [] });
  if (invalid) throw new Error(invalid);

  const folder = joinArchivePath(target.repo.folder, fields.category, fields.issuedDate.slice(0, 4), docFolderSlug(fields.docNumber));
  const name = uniqueFileName(file.name, await existingFileNames(target, folder));
  const upload = name === file.name ? file : new File([file], name, { type: file.type });

  const result = await uploadItemsToHf({ repoId: target.repo.repoId, token: target.token }, folder, [{ file: upload, relativePath: name }]);
  if (result.failed.length > 0) throw new Error(result.failed[0].error);

  const path = joinArchivePath(folder, name);
  try {
    return await saveOfficialDoc(null, { ...fields, files: [{ kind: 'goc', repoId: target.repo.repoId, path, name }] });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Tệp đã lên Kho (${path}) nhưng chưa ghi được văn bản: ${reason}`);
  }
}
