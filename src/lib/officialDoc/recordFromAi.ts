import type { AiAttachment } from '../../types/ai';
import type { OfficialDocFile } from '../../types/officialDoc';
import type { StorageRepo } from '../../types/storageRepo';
import type { ExtractedDoc } from '../ai/docExtract';
import { saveOfficialDoc } from '../api/officialDocApi';
import { listStorageRepos } from '../api/storageReposApi';
import { joinArchivePath } from '../archivePath';
import { addDocFile } from './docFiles';
import { docFolderSlug, uniqueFileName } from './docPaths';
import { prepareFormUpload } from './formBundle';
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
}

const MSG_NO_FORM_REPO = 'Chưa có kho Biểu mẫu. Liên hệ Master Admin để tạo kho Biểu mẫu.';

/** Kho Văn thư và kho Biểu mẫu (nếu có). Ném lỗi tiếng Việt khi thiếu kho Văn thư. */
export async function resolveRecordTarget(): Promise<RecordTarget> {
  const repos = await listStorageRepos();
  const repo = repos.find((r) => r.kind === 'dispatch');
  if (!repo) throw new Error('Chưa có kho Văn thư. Liên hệ Master Admin để tạo kho Văn thư.');
  const formRepo = repos.find((r) => r.kind === 'form') ?? null;
  return { repo, formRepo };
}

/** Vị trí một tệp đã lên Kho. `fileId` chỉ có với tệp Google Drive. */
interface Landed {
  path: string;
  name: string;
  fileId?: string;
}

const asDocFile = (kind: OfficialDocFile['kind'], repo: StorageRepo, f: Landed): OfficialDocFile => ({
  kind,
  repoId: repo.repoId,
  path: f.path,
  name: f.name,
  ...(f.fileId ? { fileId: f.fileId } : {}),
});

/** Thư mục văn bản trong kho: <mục>/<năm>/<số hiệu>, tính từ thư mục gốc của kho. */
function docFolderOf(fields: ExtractedDoc): string {
  return joinArchivePath(fields.category, fields.issuedDate.slice(0, 4), docFolderSlug(fields.docNumber));
}

async function existingFileNames(repo: StorageRepo, folder: string): Promise<Set<string>> {
  const [{ driveContext }, { findDriveFolderPath, listDriveChildren }] = await Promise.all([import('../drive/driveToken'), import('../drive/driveClient')]);
  const folderId = await findDriveFolderPath(driveContext, repo.repoId, folder);
  // Thư mục chưa có thì chưa có tệp nào để trùng
  if (!folderId) return new Set();
  return new Set((await listDriveChildren(driveContext, folderId)).map((f) => f.name));
}

/**
 * Tải các tệp vào một thư mục của kho (một lần), trả vị trí từng tệp theo đúng thứ tự đầu vào. Tệp lỗi thì ném lỗi tiếng Việt;
 * `nameFailures` thêm tên tệp lỗi vào đầu thông điệp (dùng khi tải nhiều tệp để biết tệp nào).
 */
async function uploadFiles(repo: StorageRepo, folder: string, items: Array<{ name: string; file: File }>, nameFailures: boolean): Promise<Landed[]> {
  const fail = (path: string, error: string) => new Error(nameFailures ? `${path.split('/').pop()}: ${error}` : error);
  const [{ driveContext }, { uploadItemsToDrive }] = await Promise.all([import('../drive/driveToken'), import('../drive/driveUpload')]);
  // Tên đã được đổi tránh trùng ở nơi gọi nên không cần Drive đổi thêm lần nữa
  const result = await uploadItemsToDrive(driveContext, repo.repoId, folder, items.map((i) => ({ file: i.file, relativePath: i.name })), []);
  if (result.failed.length > 0) throw fail(result.failed[0].path, result.failed[0].error);
  return items.map((i) => {
    const path = joinArchivePath(folder, i.name);
    const made = result.files.find((f) => f.path === path);
    if (!made) throw new Error(`Không nhận được mã tệp Google Drive của "${i.name}".`);
    return { path, name: i.name, fileId: made.fileId };
  });
}

/** Tải một tệp vào <gốc kho>/<mục>/<năm>/<số hiệu>/, đổi tên nếu trùng. Trả vị trí tệp trong kho. */
async function uploadIntoDocFolder(repo: StorageRepo, file: File, fields: ExtractedDoc): Promise<Landed> {
  const folder = docFolderOf(fields);
  const name = uniqueFileName(file.name, await existingFileNames(repo, folder));
  const upload = name === file.name ? file : new File([file], name, { type: file.type });
  const [landed] = await uploadFiles(repo, folder, [{ name, file: upload }], false);
  return landed;
}

/**
 * Tải các phụ lục (PDF, ảnh) vào cùng thư mục văn bản trong một lần. Tên trùng với tệp đã có hay giữa các
 * phụ lục với nhau thì đổi tên. Trả vị trí từng tệp theo đúng thứ tự đầu vào.
 */
async function uploadAppendices(repo: StorageRepo, files: File[], fields: ExtractedDoc): Promise<Landed[]> {
  const folder = docFolderOf(fields);
  const taken = await existingFileNames(repo, folder);
  const items = files.map((file) => {
    const name = uniqueFileName(file.name, taken);
    taken.add(name);
    return { name, file: name === file.name ? file : new File([file], name, { type: file.type }) };
  });
  return uploadFiles(repo, folder, items, true);
}

export interface FormLookup {
  /** Biểu mẫu tìm thấy trong kho Biểu mẫu, đã ở dạng tệp của văn bản. */
  files: OfficialDocFile[];
  /** Lý do chưa tra được (vd chưa có kho Biểu mẫu); null khi đã tra xong, kể cả khi không thấy gì. */
  note: string | null;
}

/** Các tệp của kho Biểu mẫu dưới dạng cây phẳng, kèm mã Drive. */
async function listFormRepoFiles(repo: StorageRepo): Promise<Array<{ type: string; path: string; name: string; fileId?: string; nativeMimeType?: string }>> {
  const [{ driveContext }, { listDriveFiles }, { buildRepoEntries }] = await Promise.all([
    import('../drive/driveToken'), import('../drive/driveClient'), import('../drive/driveTree'),
  ]);
  const entries = buildRepoEntries(await listDriveFiles(driveContext), repo.repoId);
  return entries.map((e) => ({ type: e.isFolder ? 'directory' : 'file', path: e.path, name: e.name, fileId: e.id, nativeMimeType: e.nativeMimeType }));
}

/** Tự tra kho Biểu mẫu tìm biểu mẫu của văn bản theo số hiệu. Lỗi mạng hay quyền được ném ra cho nơi gọi báo. */
export async function findFormFiles(target: RecordTarget, docNumber: string): Promise<FormLookup> {
  if (!target.formRepo) return { files: [], note: 'Chưa có kho Biểu mẫu nên chưa tự tra được biểu mẫu.' };
  const { formRepo } = target;
  const tree = await listFormRepoFiles(formRepo);
  const files = matchFormFiles(tree, docNumber).map((i) => ({
    kind: 'bieu-mau' as const,
    repoId: formRepo.repoId,
    path: i.path,
    name: i.name,
    ...(i.fileId ? { fileId: i.fileId, ...(i.nativeMimeType ? { nativeMimeType: i.nativeMimeType } : {}) } : {}),
  }));
  return { files, note: null };
}

/**
 * Tải tệp lên kho Văn thư (<gốc>/<mục>/<năm>/<số hiệu>/) rồi ghi văn bản với tệp là bản gốc.
 * Có thể kèm bộ biểu mẫu (một tệp thì giữ nguyên, nhiều tệp thì nén thành một ZIP, rồi tải lên kho
 * Biểu mẫu cùng cấu trúc thư mục) và các biểu mẫu đã có sẵn trong kho Biểu mẫu (chỉ gắn, không tải lại). Kiểm tra dữ liệu và kho đích trước khi tải
 * để không để lại tệp mồ côi vì thiếu trường hay thiếu kho.
 */
export async function recordDocFromFile(args: {
  file: File;
  fields: ExtractedDoc;
  target: RecordTarget;
  formUploads?: File[];
  formFiles?: OfficialDocFile[];
  /** Phụ lục (PDF, ảnh) của thư mục văn thư: lưu cùng thư mục với tệp gốc và gắn vào văn bản như tệp gốc. */
  appendices?: File[];
}) {
  const { file, fields, target, formUploads = [], formFiles = [], appendices = [] } = args;
  const invalid = validateOfficialDoc({ ...fields, files: [] });
  if (invalid) throw new Error(invalid);
  if (formUploads.length > 0 && !target.formRepo) throw new Error(MSG_NO_FORM_REPO);
  // Nén bộ biểu mẫu trước khi tải bất cứ gì lên, để lỗi nén không để lại tệp gốc mồ côi
  const formBundle = await prepareFormUpload(formUploads, fields.docNumber);

  const goc = await uploadIntoDocFolder(target.repo, file, fields);
  let files: OfficialDocFile[] = [asDocFile('goc', target.repo, goc)];
  const landed = [goc.path];

  if (appendices.length > 0) {
    try {
      for (const a of await uploadAppendices(target.repo, appendices, fields)) {
        files = addDocFile(files, asDocFile('goc', target.repo, a));
        landed.push(a.path);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Tệp gốc đã lên Kho (${goc.path}) nhưng chưa tải được phụ lục: ${reason}. Chưa ghi văn bản.`);
    }
  }

  if (formBundle && target.formRepo) {
    try {
      const uploaded = await uploadIntoDocFolder(target.formRepo, formBundle, fields);
      files = addDocFile(files, asDocFile('bieu-mau', target.formRepo, uploaded));
      landed.push(uploaded.path);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Tệp gốc đã lên Kho (${goc.path}) nhưng chưa tải được bộ biểu mẫu: ${reason}. Chưa ghi văn bản.`);
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
