import type { AiAttachment } from '../../types/ai';
import type { OfficialDocFile } from '../../types/officialDoc';
import type { StorageRepo } from '../../types/storageRepo';
import type { ExtractedDoc } from '../ai/docExtract';
import { saveOfficialDoc } from '../api/officialDocApi';
import { listStorageRepos } from '../api/storageReposApi';
import { joinArchivePath } from '../archivePath';
import { HfApiError, listHfTree } from '../huggingface/hfClient';
import { fetchHfAuth } from '../huggingface/hfConfigApi';
import { uploadItemsToHf } from '../huggingface/hfWrite';
import { addDocFile } from './docFiles';
import { docFolderSlug, uniqueFileName } from './docPaths';
import { matchFormFiles } from './formMatch';
import { validateOfficialDoc } from './validate';

export { docFolderSlug, uniqueFileName };

/** Chuỗi base64 của AiAttachment về lại tệp để tải lên Kho. */
export function attachmentToFile(att: Pick<AiAttachment, 'name' | 'mimeType' | 'base64Data'>): File {
  const binary = atob(att.base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], att.name, { type: att.mimeType });
}

export interface RecordTarget {
  /** Kho Văn thư: nơi để tệp gốc. */
  repo: StorageRepo;
  /** Kho Biểu mẫu: nơi để biểu mẫu; null khi chưa tạo. */
  formRepo: StorageRepo | null;
  token: string;
}

const MSG_NO_FORM_REPO = 'Chưa có kho Biểu mẫu. Liên hệ Master Admin để tạo kho Biểu mẫu.';

/** Kho Văn thư, kho Biểu mẫu (nếu có) và token dùng chung. Ném lỗi tiếng Việt khi thiếu kho Văn thư hoặc token. */
export async function resolveRecordTarget(): Promise<RecordTarget> {
  const [repos, auth] = await Promise.all([listStorageRepos(), fetchHfAuth()]);
  const repo = repos.find((r) => r.kind === 'dispatch');
  if (!repo) throw new Error('Chưa có kho Văn thư. Liên hệ Master Admin để tạo kho Văn thư.');
  if (!auth) throw new Error('Chưa cấu hình token kho lưu trữ. Liên hệ Master Admin để cấu hình.');
  return { repo, formRepo: repos.find((r) => r.kind === 'form') ?? null, token: auth.token };
}

async function existingFileNames(repo: StorageRepo, token: string, folder: string): Promise<Set<string>> {
  try {
    const tree = await listHfTree(repo.repoId, folder, token, false);
    return new Set(tree.filter((i) => i.type === 'file').map((i) => i.name));
  } catch (err) {
    // Thư mục chưa có thì chưa có tệp nào để trùng
    if (err instanceof HfApiError && err.status === 404) return new Set();
    throw err;
  }
}

/** Tải một tệp vào <gốc kho>/<mục>/<năm>/<số hiệu>/, đổi tên nếu trùng. Trả vị trí tệp trong kho. */
async function uploadIntoDocFolder(repo: StorageRepo, token: string, file: File, fields: ExtractedDoc): Promise<{ path: string; name: string }> {
  const folder = joinArchivePath(repo.folder, fields.category, fields.issuedDate.slice(0, 4), docFolderSlug(fields.docNumber));
  const name = uniqueFileName(file.name, await existingFileNames(repo, token, folder));
  const upload = name === file.name ? file : new File([file], name, { type: file.type });

  const result = await uploadItemsToHf({ repoId: repo.repoId, token }, folder, [{ file: upload, relativePath: name }]);
  if (result.failed.length > 0) throw new Error(result.failed[0].error);
  return { path: joinArchivePath(folder, name), name };
}

export interface FormLookup {
  /** Biểu mẫu tìm thấy trong kho Biểu mẫu, đã ở dạng tệp của văn bản. */
  files: OfficialDocFile[];
  /** Lý do chưa tra được (vd chưa có kho Biểu mẫu); null khi đã tra xong, kể cả khi không thấy gì. */
  note: string | null;
}

/** Tự tra kho Biểu mẫu tìm biểu mẫu của văn bản theo số hiệu. Lỗi mạng hay token được ném ra cho nơi gọi báo. */
export async function findFormFiles(target: RecordTarget, docNumber: string): Promise<FormLookup> {
  if (!target.formRepo) return { files: [], note: 'Chưa có kho Biểu mẫu nên chưa tự tra được biểu mẫu.' };
  const { formRepo, token } = target;
  const tree = await listHfTree(formRepo.repoId, formRepo.folder, token, true);
  const files = matchFormFiles(tree, docNumber).map((i) => ({
    kind: 'bieu-mau' as const,
    repoId: formRepo.repoId,
    path: i.path,
    name: i.name,
  }));
  return { files, note: null };
}

/**
 * Tải tệp lên kho Văn thư (<gốc>/<mục>/<năm>/<số hiệu>/) rồi ghi văn bản với tệp là bản gốc.
 * Có thể kèm thư mục nén biểu mẫu (tải lên kho Biểu mẫu, cùng cấu trúc thư mục) và các biểu mẫu
 * đã có sẵn trong kho Biểu mẫu (chỉ gắn, không tải lại). Kiểm tra dữ liệu và kho đích trước khi tải
 * để không để lại tệp mồ côi vì thiếu trường hay thiếu kho.
 */
export async function recordDocFromFile(args: {
  file: File;
  fields: ExtractedDoc;
  target: RecordTarget;
  formZip?: File | null;
  formFiles?: OfficialDocFile[];
}) {
  const { file, fields, target, formZip = null, formFiles = [] } = args;
  const invalid = validateOfficialDoc({ ...fields, files: [] });
  if (invalid) throw new Error(invalid);
  if (formZip && !target.formRepo) throw new Error(MSG_NO_FORM_REPO);

  const goc = await uploadIntoDocFolder(target.repo, target.token, file, fields);
  let files: OfficialDocFile[] = [{ kind: 'goc', repoId: target.repo.repoId, path: goc.path, name: goc.name }];
  const landed = [goc.path];

  if (formZip && target.formRepo) {
    try {
      const zip = await uploadIntoDocFolder(target.formRepo, target.token, formZip, fields);
      files = addDocFile(files, { kind: 'bieu-mau', repoId: target.formRepo.repoId, path: zip.path, name: zip.name });
      landed.push(zip.path);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Tệp gốc đã lên Kho (${goc.path}) nhưng chưa tải được thư mục nén biểu mẫu: ${reason}. Chưa ghi văn bản.`);
    }
  }
  for (const f of formFiles) files = addDocFile(files, f);

  try {
    return await saveOfficialDoc(null, { ...fields, files });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Tệp đã lên Kho (${landed.join(', ')}) nhưng chưa ghi được văn bản: ${reason}`);
  }
}
