import { DriveApiError, readDriveError } from './driveErrors';
import { exportTargetOf } from './driveExport';
import { DRIVE_FOLDER_MIME, type DriveContext, type DriveFile } from './driveTypes';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FILE_FIELDS = 'id,name,mimeType,size,parents,modifiedTime,createdTime';
/** Mỗi đoạn tải lên phải là bội của 256 KiB. */
export const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_LIST_PAGES = 200;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

type Json = Record<string, unknown>;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const fetcher = (ctx: DriveContext) => ctx.fetchFn ?? fetch;

/** Chuỗi trong câu truy vấn q của Drive: đặt trong nháy đơn, escape \ và '. */
export const driveQueryLiteral = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Dữ liệu Drive trả về đã đọc thành DriveFile; size/parents thiếu thì lấy 0/rỗng. */
export function toDriveFile(raw: Json): DriveFile {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    mimeType: String(raw.mimeType ?? ''),
    size: Number(raw.size ?? 0) || 0,
    parents: Array.isArray(raw.parents) ? (raw.parents as unknown[]).map(String) : [],
    modifiedTime: String(raw.modifiedTime ?? ''),
    createdTime: String(raw.createdTime ?? ''),
  };
}

/**
 * Gọi Drive kèm token. 401 thì bỏ token, xin lại và thử một lần; 429 và 5xx thì thử lại tối đa 3 lần với thời gian chờ tăng dần.
 * Mọi lỗi cuối cùng thành DriveApiError.
 */
export async function driveRequest(ctx: DriveContext, url: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = fetcher(ctx);
  const sleep = ctx.sleep ?? defaultSleep;
  let refreshed = false;

  for (let attempt = 0; ; attempt++) {
    const access = await ctx.getAccess();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${access.accessToken}`);
    const res = await doFetch(url, { ...init, headers });
    if (res.ok || res.status === 308) return res;

    if (res.status === 401 && !refreshed) {
      refreshed = true;
      ctx.invalidate();
      continue;
    }
    if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    throw await readDriveError(res);
  }
}

async function jsonOf<T = Json>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** Mọi mục chưa vào thùng rác của cả Shared Drive, mỗi trang tối đa 1.000 mục. */
export async function listDriveFiles(ctx: DriveContext): Promise<DriveFile[]> {
  return listDriveQuery(ctx, 'trashed = false');
}

/** Các Shared Drive mà tài khoản đang dùng là thành viên (dùng để chẩn đoán khi ID Shared Drive đã đặt không tìm thấy). */
export async function listAccessibleDrives(ctx: DriveContext): Promise<Array<{ id: string; name: string }>> {
  const out: Array<{ id: string; name: string }> = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ pageSize: '100', fields: 'nextPageToken,drives(id,name)' });
    if (pageToken) params.set('pageToken', pageToken);
    const body = await jsonOf<{ drives?: Json[]; nextPageToken?: string }>(await driveRequest(ctx, `${API}/drives?${params}`));
    out.push(...(body.drives ?? []).map((d) => ({ id: String(d.id ?? ''), name: String(d.name ?? '') })));
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return out;
}

/** Các mục (tệp và thư mục) nằm trực tiếp trong một thư mục, không tính thùng rác. */
export async function listDriveChildren(ctx: DriveContext, parentId: string): Promise<DriveFile[]> {
  return listDriveQuery(ctx, `trashed = false and '${driveQueryLiteral(parentId)}' in parents`);
}

/** Mã thư mục tại đường dẫn "a/b/c" dưới `rootId`, không tạo gì; null nếu thiếu đoạn nào. Đường dẫn rỗng là chính `rootId`. */
export async function findDriveFolderPath(ctx: DriveContext, rootId: string, path: string): Promise<string | null> {
  let parentId = rootId;
  for (const segment of path.split('/').filter(Boolean)) {
    const found = await findDriveChildFolder(ctx, parentId, segment);
    if (!found) return null;
    parentId = found.id;
  }
  return parentId;
}

async function listDriveQuery(ctx: DriveContext, q: string): Promise<DriveFile[]> {
  const { driveId } = await ctx.getAccess();
  const out: DriveFile[] = [];
  let pageToken = '';
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const params = new URLSearchParams({
      corpora: 'drive',
      driveId,
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      q,
      pageSize: '1000',
      fields: `nextPageToken,files(${FILE_FIELDS})`,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const body = await jsonOf<{ files?: Json[]; nextPageToken?: string }>(await driveRequest(ctx, `${API}/files?${params}`));
    out.push(...(body.files ?? []).map(toDriveFile));
    if (!body.nextPageToken) return out;
    pageToken = body.nextPageToken;
  }
  throw new Error(`Shared Drive có quá nhiều mục (hơn ${MAX_LIST_PAGES * 1000}). Chia nhỏ hoặc liên hệ người phụ trách kỹ thuật.`);
}

export async function getDriveFile(ctx: DriveContext, id: string): Promise<DriveFile> {
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: FILE_FIELDS });
  return toDriveFile(await jsonOf(await driveRequest(ctx, `${API}/files/${encodeURIComponent(id)}?${params}`)));
}

const writeParams = () => new URLSearchParams({ supportsAllDrives: 'true', fields: FILE_FIELDS });
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=UTF-8' };

export async function createDriveFolder(ctx: DriveContext, parentId: string, name: string): Promise<DriveFile> {
  const res = await driveRequest(ctx, `${API}/files?${writeParams()}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name, mimeType: DRIVE_FOLDER_MIME, parents: [parentId] }),
  });
  return toDriveFile(await jsonOf(res));
}

export async function renameDriveFile(ctx: DriveContext, id: string, name: string): Promise<DriveFile> {
  const res = await driveRequest(ctx, `${API}/files/${encodeURIComponent(id)}?${writeParams()}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  });
  return toDriveFile(await jsonOf(res));
}

export async function moveDriveFile(ctx: DriveContext, id: string, fromParentId: string, toParentId: string): Promise<DriveFile> {
  const params = writeParams();
  params.set('addParents', toParentId);
  params.set('removeParents', fromParentId);
  const res = await driveRequest(ctx, `${API}/files/${encodeURIComponent(id)}?${params}`, { method: 'PATCH', headers: JSON_HEADERS, body: '{}' });
  return toDriveFile(await jsonOf(res));
}

/** Sao chép phía máy chủ Google (không tải qua trình duyệt). Chỉ sao chép được tệp, không sao chép thư mục. */
export async function copyDriveFile(ctx: DriveContext, id: string, parentId: string, name: string): Promise<DriveFile> {
  const res = await driveRequest(ctx, `${API}/files/${encodeURIComponent(id)}/copy?${writeParams()}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name, parents: [parentId] }),
  });
  return toDriveFile(await jsonOf(res));
}

/** Đưa vào thùng rác của Shared Drive (khôi phục được); thư mục thì kéo theo mọi thứ bên trong. */
export async function trashDriveFile(ctx: DriveContext, id: string): Promise<void> {
  await driveRequest(ctx, `${API}/files/${encodeURIComponent(id)}?${writeParams()}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ trashed: true }),
  });
}

/** Thư mục con theo tên, nếu có (so đúng tên). */
export async function findDriveChildFolder(ctx: DriveContext, parentId: string, name: string): Promise<DriveFile | null> {
  const { driveId } = await ctx.getAccess();
  const params = new URLSearchParams({
    corpora: 'drive',
    driveId,
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    q: `trashed = false and mimeType = '${DRIVE_FOLDER_MIME}' and '${driveQueryLiteral(parentId)}' in parents and name = '${driveQueryLiteral(name)}'`,
    pageSize: '10',
    fields: `files(${FILE_FIELDS})`,
  });
  const body = await jsonOf<{ files?: Json[] }>(await driveRequest(ctx, `${API}/files?${params}`));
  const first = body.files?.[0];
  return first ? toDriveFile(first) : null;
}

/** Thư mục con theo tên: dùng cái có sẵn, chưa có thì tạo. */
export async function ensureDriveFolder(ctx: DriveContext, parentId: string, name: string): Promise<DriveFile> {
  return (await findDriveChildFolder(ctx, parentId, name)) ?? createDriveFolder(ctx, parentId, name);
}

/** Đường dẫn thư mục đã biết hay đang được tạo. Giữ promise để các luồng chạy song song dùng chung một lần tạo, không tạo trùng. */
export type FolderPathCache = Map<string, Promise<string>>;

/** `known` là các thư mục đã có (đường dẫn → mã) nên khỏi tìm lại, và không phụ thuộc chỉ mục tìm kiếm của Google vốn có thể chậm. */
export function newFolderPathCache(known: ReadonlyMap<string, string> = new Map()): FolderPathCache {
  return new Map([...known].map(([path, id]) => [path, Promise.resolve(id)]));
}

/** Tạo chuỗi thư mục "a/b/c" dưới `rootId`, dùng lại thư mục đã có; trả ID thư mục cuối. */
export async function ensureDriveFolderPath(
  ctx: DriveContext,
  rootId: string,
  path: string,
  cache: FolderPathCache = new Map(),
): Promise<string> {
  let parentId = rootId;
  let walked = '';
  for (const segment of path.split('/').filter(Boolean)) {
    walked = walked ? `${walked}/${segment}` : segment;
    let pending = cache.get(walked);
    if (!pending) {
      const key = walked;
      pending = ensureDriveFolder(ctx, parentId, segment).then((f) => f.id);
      cache.set(key, pending);
      // Lỗi thì bỏ khỏi bộ nhớ đệm để lần sau thử lại, không giữ kết quả hỏng
      pending.catch(() => cache.delete(key));
    }
    parentId = await pending;
  }
  return parentId;
}

/** Phản hồi tải tệp (để đọc theo luồng khi nén ZIP). Tệp Google Docs/Sheets/Slides được xuất sang Office. */
export async function openDriveDownload(ctx: DriveContext, id: string, nativeMimeType = '', signal?: AbortSignal): Promise<Response> {
  const target = nativeMimeType ? exportTargetOf(nativeMimeType) : null;
  if (nativeMimeType && !target) throw new Error('Loại tệp Google này không tải về được.');
  const url = target
    ? `${API}/files/${encodeURIComponent(id)}/export?${new URLSearchParams({ mimeType: target.mimeType })}`
    : `${API}/files/${encodeURIComponent(id)}?${new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' })}`;
  return driveRequest(ctx, url, { signal });
}

export async function downloadDriveBlob(ctx: DriveContext, id: string, nativeMimeType = '', signal?: AbortSignal): Promise<Blob> {
  return (await openDriveDownload(ctx, id, nativeMimeType, signal)).blob();
}

export interface UploadOptions {
  onProgress?: (sentBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
  chunkBytes?: number;
}

/** Số byte Google đã nhận theo tiêu đề Range ("bytes=0-1023"); không có thì null. */
export function receivedBytes(range: string | null): number | null {
  const m = range?.match(/bytes=0-(\d+)/);
  return m ? Number(m[1]) + 1 : null;
}

/**
 * Tải tệp lên thư mục `parentId` theo kiểu resumable: từng đoạn 8 MiB, mất mạng giữa chừng thì hỏi Google đã nhận tới đâu
 * và gửi tiếp. Trả tệp vừa tạo. Tệp rỗng thì tạo thẳng không qua phiên tải lên.
 */
export async function uploadDriveFile(ctx: DriveContext, parentId: string, file: File, options: UploadOptions = {}): Promise<DriveFile> {
  const { onProgress, signal } = options;
  const total = file.size;
  const type = file.type || 'application/octet-stream';

  if (total === 0) {
    const res = await driveRequest(ctx, `${API}/files?${writeParams()}`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: file.name, parents: [parentId], mimeType: type }),
      signal,
    });
    onProgress?.(0, 0);
    return toDriveFile(await jsonOf(res));
  }

  const init = await driveRequest(ctx, `${UPLOAD_API}/files?${new URLSearchParams({ uploadType: 'resumable', supportsAllDrives: 'true', fields: FILE_FIELDS })}`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(total) },
    body: JSON.stringify({ name: file.name, parents: [parentId] }),
    signal,
  });
  const session = init.headers.get('Location');
  if (!session) throw new Error('Google Drive không trả về địa chỉ phiên tải lên.');
  return sendResumable(ctx, session, file, options);
}

/**
 * Ghi đè nội dung một tệp đã có (giữ nguyên mã, tên và thư mục), cùng kiểu resumable với uploadDriveFile.
 * Tệp rỗng không hỗ trợ vì Drive không mở được phiên tải lên cho 0 byte.
 */
export async function updateDriveFile(ctx: DriveContext, fileId: string, file: Blob, options: UploadOptions = {}): Promise<DriveFile> {
  if (file.size === 0) throw new Error('Không ghi được tệp rỗng lên Google Drive.');
  const type = file.type || 'application/octet-stream';
  const init = await driveRequest(ctx, `${UPLOAD_API}/files/${encodeURIComponent(fileId)}?${new URLSearchParams({ uploadType: 'resumable', supportsAllDrives: 'true', fields: FILE_FIELDS })}`, {
    method: 'PATCH',
    headers: { ...JSON_HEADERS, 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(file.size) },
    body: '{}',
    signal: options.signal,
  });
  const session = init.headers.get('Location');
  if (!session) throw new Error('Google Drive không trả về địa chỉ phiên tải lên.');
  return sendResumable(ctx, session, file, options);
}

/** Gửi nội dung vào một phiên tải lên đã mở: từng đoạn, mất mạng thì hỏi Google đã nhận tới đâu và gửi tiếp. */
async function sendResumable(ctx: DriveContext, session: string, file: Blob, options: UploadOptions): Promise<DriveFile> {
  const { onProgress, signal } = options;
  const chunk = Math.max(256 * 1024, Math.floor((options.chunkBytes ?? UPLOAD_CHUNK_BYTES) / (256 * 1024)) * 256 * 1024);
  const total = file.size;
  const doFetch = fetcher(ctx);
  const sleep = ctx.sleep ?? defaultSleep;
  // Chỉ khi cần tiến độ từng byte, chạy trong trình duyệt thật (có XHR) và không bị thay hàm gọi mạng (test)
  const useXhr = Boolean(onProgress) && !ctx.fetchFn && typeof XMLHttpRequest !== 'undefined';

  let offset = 0;
  let failures = 0;
  while (offset < total) {
    signal?.throwIfAborted();
    const end = Math.min(offset + chunk, total) - 1;
    let res: Response;
    try {
      const range = { 'Content-Range': `bytes ${offset}-${end}/${total}` };
      const part = file.slice(offset, end + 1);
      if (useXhr) {
        // fetch không báo tiến độ gửi; XHR báo từng byte. Cũng đọc được 308 như fetch mặc định.
        res = await putWithProgress(session, range, part, signal, (loaded) => onProgress?.(Math.min(offset + loaded, total), total));
      } else {
        // Không đặt redirect: 'manual': trình duyệt biến mọi 3xx thành phản hồi mờ (status 0, không đọc được tiêu đề), nên 308 hợp lệ
        // của Google giữa các đoạn thành lỗi. Mặc định thì 308 không có Location trả về nguyên vẹn.
        res = await doFetch(session, { method: 'PUT', headers: range, body: part, signal });
      }
    } catch (err) {
      if (signal?.aborted || failures >= MAX_RETRIES) throw err;
      failures++;
      await sleep(500 * 2 ** failures);
      offset = await queryUploadOffset(doFetch, session, total, offset);
      continue;
    }

    if (res.status === 200 || res.status === 201) {
      onProgress?.(total, total);
      return toDriveFile(await jsonOf(res));
    }
    if (res.status === 308) {
      // Không đọc được Range (trình duyệt không cho thấy) thì coi như Google nhận đủ đoạn vừa gửi
      offset = receivedBytes(res.headers.get('Range')) ?? end + 1;
      failures = 0;
      onProgress?.(offset, total);
      continue;
    }
    if (RETRYABLE.has(res.status) && failures < MAX_RETRIES) {
      failures++;
      await sleep(500 * 2 ** failures);
      offset = await queryUploadOffset(doFetch, session, total, offset);
      continue;
    }
    throw await readDriveError(res);
  }
  throw new DriveApiError(500, '', 'Phiên tải lên kết thúc mà Google chưa xác nhận tệp. Hãy thử lại.');
}

/**
 * Gửi một đoạn bằng XHR để biết số byte đã gửi. Trả Response như fetch: 308 đọc được status, tiêu đề lấy từ các tiêu đề
 * trình duyệt cho đọc. Lỗi mạng thành TypeError (giống fetch) để đi chung đường thử lại; hủy thành AbortError.
 */
function putWithProgress(url: string, headers: Record<string, string>, body: Blob, signal: AbortSignal | undefined, onLoaded: (loaded: number) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Đã hủy', 'AbortError'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    const done = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort);

    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => onLoaded(e.loaded);
    xhr.onload = () => {
      done();
      const resHeaders = new Headers();
      for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
        const i = line.indexOf(':');
        if (i > 0) resHeaders.append(line.slice(0, i).trim(), line.slice(i + 1).trim());
      }
      resolve(new Response(xhr.responseText || null, { status: xhr.status, headers: resHeaders }));
    };
    xhr.onerror = () => {
      done();
      reject(new TypeError('Failed to fetch'));
    };
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => {
      done();
      reject(signal?.reason ?? new DOMException('Đã hủy', 'AbortError'));
    };
    xhr.send(body);
  });
}

/** Hỏi Google đã nhận tới byte nào của phiên tải lên; lỗi mạng thì giữ vị trí cũ. */
async function queryUploadOffset(doFetch: typeof fetch, session: string, total: number, fallback: number): Promise<number> {
  try {
    const res = await doFetch(session, { method: 'PUT', headers: { 'Content-Range': `bytes */${total}` } });
    if (res.status === 308) return receivedBytes(res.headers.get('Range')) ?? 0;
  } catch {
    // Chưa hỏi được: gửi lại đoạn cũ
  }
  return fallback;
}
