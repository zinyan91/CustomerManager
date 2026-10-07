import { describe, expect, it, vi } from 'vitest';
import {
  UPLOAD_CHUNK_BYTES, copyDriveFile, createDriveFolder, downloadDriveBlob, driveQueryLiteral, driveRequest, ensureDriveFolderPath, newFolderPathCache,
  findDriveChildFolder, getDriveFile, listDriveFiles, moveDriveFile, openDriveDownload, receivedBytes, renameDriveFile, toDriveFile,
  trashDriveFile, uploadDriveFile,
} from '../driveClient';
import { DriveApiError } from '../driveErrors';
import type { DriveContext } from '../driveTypes';

type Reply = Response | Error | ((url: string, init: RequestInit) => Response | Promise<Response>);

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const apiError = (status: number, reason: string, message = 'loi') => json({ error: { code: status, message, errors: [{ reason }] } }, status);

const RAW = { id: 'F1', name: 'a.pdf', mimeType: 'application/pdf', size: '123', parents: ['P'], modifiedTime: 't1', createdTime: 't0' };

function setup(replies: Reply[]) {
  const calls: Array<{ url: string; init: RequestInit; headers: Headers }> = [];
  const queue = [...replies];
  const fetchFn = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers) });
    const next = queue.shift();
    if (!next) throw new Error(`Không còn phản hồi giả cho ${String(url)}`);
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(String(url), init) : next;
  });
  const access = { accessToken: 'tok-1', expiresAt: Date.now() + 3_600_000, access: 'write' as const, driveId: 'DRIVE' };
  const invalidate = vi.fn();
  const getAccess = vi.fn(async () => access);
  const sleeps: number[] = [];
  const ctx: DriveContext = { getAccess, invalidate, fetchFn: fetchFn as unknown as typeof fetch, sleep: async (ms) => void sleeps.push(ms) };
  return { ctx, calls, getAccess, invalidate, sleeps, remaining: () => queue.length };
}

const params = (url: string) => new URL(url).searchParams;

describe('toDriveFile / driveQueryLiteral / receivedBytes', () => {
  it('đọc dữ liệu thô, size dạng chuỗi thành số, thiếu trường thì mặc định', () => {
    expect(toDriveFile(RAW)).toEqual({ id: 'F1', name: 'a.pdf', mimeType: 'application/pdf', size: 123, parents: ['P'], modifiedTime: 't1', createdTime: 't0' });
    expect(toDriveFile({ id: 'X' })).toMatchObject({ size: 0, parents: [], name: '' });
  });
  it('escape dấu nháy và gạch chéo ngược trong truy vấn', () => {
    expect(driveQueryLiteral("Nguyễn's \\ test")).toBe("Nguyễn\\'s \\\\ test");
  });
  it('receivedBytes đọc tiêu đề Range', () => {
    expect(receivedBytes('bytes=0-1023')).toBe(1024);
    expect(receivedBytes(null)).toBeNull();
    expect(receivedBytes('abc')).toBeNull();
  });
});

describe('driveRequest', () => {
  it('gắn Bearer token', async () => {
    const s = setup([json({})]);
    await driveRequest(s.ctx, 'https://x/y');
    expect(s.calls[0].headers.get('Authorization')).toBe('Bearer tok-1');
  });

  it('401: bỏ token, xin lại và thử lại đúng một lần', async () => {
    const s = setup([apiError(401, 'authError'), json({ ok: 1 })]);
    const res = await driveRequest(s.ctx, 'https://x/y');
    expect(res.ok).toBe(true);
    expect(s.invalidate).toHaveBeenCalledTimes(1);
    expect(s.calls).toHaveLength(2);
  });

  it('401 hai lần thì ném lỗi, không thử mãi', async () => {
    const s = setup([apiError(401, 'authError'), apiError(401, 'authError')]);
    await expect(driveRequest(s.ctx, 'https://x/y')).rejects.toMatchObject({ status: 401 });
    expect(s.calls).toHaveLength(2);
  });

  it('429 và 5xx: thử lại với thời gian chờ tăng dần, rồi thành công', async () => {
    const s = setup([apiError(429, 'rateLimitExceeded'), apiError(503, 'backendError'), json({ ok: 1 })]);
    await driveRequest(s.ctx, 'https://x/y');
    expect(s.sleeps).toEqual([500, 1000]);
    expect(s.calls).toHaveLength(3);
  });

  it('thử lại đủ 3 lần mà vẫn lỗi thì ném lỗi cuối', async () => {
    const s = setup([503, 503, 503, 503].map((c) => apiError(c, 'backendError')));
    await expect(driveRequest(s.ctx, 'https://x/y')).rejects.toBeInstanceOf(DriveApiError);
    expect(s.calls).toHaveLength(4);
  });

  it('403 và 404 không thử lại, đọc lý do của Google', async () => {
    const s = setup([apiError(403, 'insufficientFilePermissions', 'cấm')]);
    await expect(driveRequest(s.ctx, 'https://x/y')).rejects.toMatchObject({ status: 403, reason: 'insufficientFilePermissions', message: 'cấm' });
    expect(s.calls).toHaveLength(1);
  });

  it('phản hồi lỗi không phải JSON vẫn thành DriveApiError theo mã HTTP', async () => {
    const s = setup([new Response('<html>', { status: 400, statusText: 'Bad Request' })]);
    await expect(driveRequest(s.ctx, 'https://x/y')).rejects.toMatchObject({ status: 400, message: 'Bad Request' });
  });

  it('lỗi mạng được ném nguyên (TypeError) để nơi gọi phân loại', async () => {
    const s = setup([new TypeError('Failed to fetch')]);
    await expect(driveRequest(s.ctx, 'https://x/y')).rejects.toBeInstanceOf(TypeError);
  });
});

describe('listDriveFiles', () => {
  it('gọi theo Shared Drive, lọc thùng rác, phân trang đến hết', async () => {
    const s = setup([json({ files: [RAW], nextPageToken: 'N1' }), json({ files: [{ ...RAW, id: 'F2' }] })]);
    const files = await listDriveFiles(s.ctx);
    expect(files.map((f) => f.id)).toEqual(['F1', 'F2']);
    const p1 = params(s.calls[0].url);
    expect(p1.get('corpora')).toBe('drive');
    expect(p1.get('driveId')).toBe('DRIVE');
    expect(p1.get('supportsAllDrives')).toBe('true');
    expect(p1.get('includeItemsFromAllDrives')).toBe('true');
    expect(p1.get('q')).toBe('trashed = false');
    expect(p1.get('pageSize')).toBe('1000');
    expect(p1.get('pageToken')).toBeNull();
    expect(params(s.calls[1].url).get('pageToken')).toBe('N1');
  });

  it('Shared Drive rỗng thì trả mảng rỗng', async () => {
    expect(await listDriveFiles(setup([json({})]).ctx)).toEqual([]);
  });

  it('lỗi giữa chừng được ném, không trả danh sách thiếu', async () => {
    const s = setup([json({ files: [RAW], nextPageToken: 'N1' }), apiError(403, 'forbidden')]);
    await expect(listDriveFiles(s.ctx)).rejects.toMatchObject({ status: 403 });
  });
});

describe('thao tác ghi', () => {
  it('createDriveFolder: POST đúng kiểu thư mục và thư mục cha', async () => {
    const s = setup([json({ ...RAW, id: 'NEW', mimeType: 'application/vnd.google-apps.folder' })]);
    const f = await createDriveFolder(s.ctx, 'PARENT', 'Hồ sơ');
    expect(f.id).toBe('NEW');
    expect(s.calls[0].init.method).toBe('POST');
    expect(s.calls[0].url).toContain('/drive/v3/files?');
    expect(params(s.calls[0].url).get('supportsAllDrives')).toBe('true');
    expect(JSON.parse(String(s.calls[0].init.body))).toEqual({ name: 'Hồ sơ', mimeType: 'application/vnd.google-apps.folder', parents: ['PARENT'] });
  });

  it('renameDriveFile: PATCH đúng ID với tên mới', async () => {
    const s = setup([json(RAW)]);
    await renameDriveFile(s.ctx, 'F 1', 'moi.pdf');
    expect(s.calls[0].init.method).toBe('PATCH');
    expect(s.calls[0].url).toContain('/files/F%201?');
    expect(JSON.parse(String(s.calls[0].init.body))).toEqual({ name: 'moi.pdf' });
  });

  it('moveDriveFile: addParents và removeParents', async () => {
    const s = setup([json(RAW)]);
    await moveDriveFile(s.ctx, 'F1', 'OLD', 'NEW');
    const p = params(s.calls[0].url);
    expect(p.get('addParents')).toBe('NEW');
    expect(p.get('removeParents')).toBe('OLD');
    expect(s.calls[0].init.method).toBe('PATCH');
  });

  it('copyDriveFile: POST /copy với tên và thư mục đích', async () => {
    const s = setup([json({ ...RAW, id: 'COPY' })]);
    expect((await copyDriveFile(s.ctx, 'F1', 'DEST', 'a-2.pdf')).id).toBe('COPY');
    expect(s.calls[0].url).toContain('/files/F1/copy?');
    expect(JSON.parse(String(s.calls[0].init.body))).toEqual({ name: 'a-2.pdf', parents: ['DEST'] });
  });

  it('trashDriveFile: đưa vào thùng rác, không xóa vĩnh viễn', async () => {
    const s = setup([json({})]);
    await trashDriveFile(s.ctx, 'F1');
    expect(s.calls[0].init.method).toBe('PATCH');
    expect(JSON.parse(String(s.calls[0].init.body))).toEqual({ trashed: true });
  });

  it('getDriveFile đọc một mục', async () => {
    expect((await getDriveFile(setup([json(RAW)]).ctx, 'F1')).name).toBe('a.pdf');
  });
});

describe('thư mục theo đường dẫn', () => {
  it('findDriveChildFolder escape tên có dấu nháy và trả null khi không có', async () => {
    const s = setup([json({ files: [] })]);
    expect(await findDriveChildFolder(s.ctx, 'P', "Nguyễn's")).toBeNull();
    expect(params(s.calls[0].url).get('q')).toContain("name = 'Nguyễn\\'s'");
    expect(params(s.calls[0].url).get('q')).toContain("'P' in parents");
  });

  it('ensureDriveFolderPath: dùng thư mục có sẵn, tạo phần còn thiếu, nhớ đường đã làm', async () => {
    const s = setup([
      json({ files: [{ ...RAW, id: 'A' }] }), // "van-ban" đã có
      json({ files: [] }), // "2026" chưa có
      json({ ...RAW, id: 'B' }), // tạo "2026"
    ]);
    const cache = newFolderPathCache();
    expect(await ensureDriveFolderPath(s.ctx, 'ROOT', 'van-ban/2026', cache)).toBe('B');
    expect(s.calls).toHaveLength(3);
    expect(await cache.get('van-ban')).toBe('A');
    expect(await cache.get('van-ban/2026')).toBe('B');
    // Lần hai đã có trong cache: không gọi mạng
    expect(await ensureDriveFolderPath(s.ctx, 'ROOT', 'van-ban/2026', cache)).toBe('B');
    expect(s.calls).toHaveLength(3);
  });

  it('ensureDriveFolderPath: thư mục đã biết sẵn thì không hỏi Google, chỉ tạo phần còn thiếu', async () => {
    const s = setup([json({ files: [] }), json({ ...RAW, id: 'NEW' })]);
    const cache = newFolderPathCache(new Map([['van-ban', 'A']]));
    expect(await ensureDriveFolderPath(s.ctx, 'ROOT', 'van-ban/2026', cache)).toBe('NEW');
    expect(s.calls).toHaveLength(2);
    expect(params(s.calls[0].url).get('q')).toContain("'A' in parents");
  });

  it('ensureDriveFolderPath: gọi song song cùng đường dẫn mới thì chỉ tạo một thư mục', async () => {
    const s = setup([json({ files: [] }), json({ ...RAW, id: 'ONE' })]);
    const cache = newFolderPathCache();
    const ids = await Promise.all([1, 2, 3].map(() => ensureDriveFolderPath(s.ctx, 'ROOT', 'moi', cache)));
    expect(ids).toEqual(['ONE', 'ONE', 'ONE']);
    expect(s.calls).toHaveLength(2);
  });

  it('ensureDriveFolderPath: tạo thất bại thì không nhớ kết quả hỏng, lần sau thử lại được', async () => {
    const s = setup([json({ files: [] }), new Response('', { status: 400 }), json({ files: [] }), json({ ...RAW, id: 'OK' })]);
    const cache = newFolderPathCache();
    await expect(ensureDriveFolderPath(s.ctx, 'ROOT', 'moi', cache)).rejects.toBeTruthy();
    expect(cache.has('moi')).toBe(false);
    expect(await ensureDriveFolderPath(s.ctx, 'ROOT', 'moi', cache)).toBe('OK');
  });

  it('đường dẫn rỗng thì trả luôn thư mục gốc', async () => {
    const s = setup([]);
    expect(await ensureDriveFolderPath(s.ctx, 'ROOT', '')).toBe('ROOT');
    expect(s.calls).toHaveLength(0);
  });
});

describe('tải về', () => {
  it('tệp thường: alt=media', async () => {
    const s = setup([new Response('noi dung')]);
    const blob = await downloadDriveBlob(s.ctx, 'F1');
    expect(await blob.text()).toBe('noi dung');
    expect(s.calls[0].url).toContain('/files/F1?');
    expect(params(s.calls[0].url).get('alt')).toBe('media');
  });

  it('tệp Google Docs: gọi export sang docx', async () => {
    const s = setup([new Response('x')]);
    await openDriveDownload(s.ctx, 'D1', 'application/vnd.google-apps.document');
    expect(s.calls[0].url).toContain('/files/D1/export?');
    expect(params(s.calls[0].url).get('mimeType')).toContain('wordprocessingml');
  });

  it('loại Google không xuất được thì báo lỗi, không gọi mạng', async () => {
    const s = setup([]);
    await expect(openDriveDownload(s.ctx, 'D1', 'application/vnd.google-apps.form')).rejects.toThrow(/không tải về được/);
    expect(s.calls).toHaveLength(0);
  });

  it('404 thành DriveApiError', async () => {
    await expect(downloadDriveBlob(setup([apiError(404, 'notFound')]).ctx, 'F1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('uploadDriveFile', () => {
  const SESSION = 'https://www.googleapis.com/upload/drive/v3/files?upload_id=ABC';
  const initReply = () => new Response('{}', { status: 200, headers: { Location: SESSION } });
  const bytes = (n: number) => new File([new Uint8Array(n)], 'lon.bin', { type: 'application/octet-stream' });

  it('tệp rỗng: tạo thẳng, không mở phiên', async () => {
    const s = setup([json({ ...RAW, id: 'E' })]);
    const f = await uploadDriveFile(s.ctx, 'P', new File([], 'rong.txt', { type: 'text/plain' }));
    expect(f.id).toBe('E');
    expect(s.calls).toHaveLength(1);
    expect(JSON.parse(String(s.calls[0].init.body))).toMatchObject({ name: 'rong.txt', parents: ['P'] });
  });

  it('tệp nhỏ: mở phiên (có tên, thư mục cha, kiểu và dung lượng) rồi gửi một lần', async () => {
    const s = setup([initReply(), json({ ...RAW, id: 'UP' })]);
    const progress: Array<[number, number]> = [];
    const f = await uploadDriveFile(s.ctx, 'P', new File(['abcdef'], 'a.txt', { type: 'text/plain' }), { onProgress: (a, b) => progress.push([a, b]) });
    expect(f.id).toBe('UP');
    expect(s.calls[0].url).toContain('uploadType=resumable');
    expect(s.calls[0].headers.get('X-Upload-Content-Type')).toBe('text/plain');
    expect(s.calls[0].headers.get('X-Upload-Content-Length')).toBe('6');
    expect(JSON.parse(String(s.calls[0].init.body))).toEqual({ name: 'a.txt', parents: ['P'] });
    expect(s.calls[1].url).toBe(SESSION);
    expect(s.calls[1].headers.get('Content-Range')).toBe('bytes 0-5/6');
    expect(s.calls[1].headers.has('Authorization')).toBe(false);
    expect(progress).toEqual([[6, 6]]);
  });

  it('tệp lớn chia đoạn bội của 256 KiB, theo Range Google trả về, báo tiến độ', async () => {
    const CH = 256 * 1024;
    const total = CH * 2 + 1000;
    const s = setup([
      initReply(),
      new Response(null, { status: 308, headers: { Range: `bytes=0-${CH - 1}` } }),
      new Response(null, { status: 308, headers: { Range: `bytes=0-${CH * 2 - 1}` } }),
      json({ ...RAW, id: 'BIG' }),
    ]);
    const progress: number[] = [];
    const f = await uploadDriveFile(s.ctx, 'P', bytes(total), { chunkBytes: CH, onProgress: (a) => progress.push(a) });
    expect(f.id).toBe('BIG');
    expect(s.calls.slice(1).map((c) => c.headers.get('Content-Range'))).toEqual([
      `bytes 0-${CH - 1}/${total}`, `bytes ${CH}-${CH * 2 - 1}/${total}`, `bytes ${CH * 2}-${total - 1}/${total}`,
    ]);
    expect(progress).toEqual([CH, CH * 2, total]);
  });

  it('không đọc được Range thì coi như đoạn đã được nhận đủ', async () => {
    const CH = 256 * 1024;
    const s = setup([initReply(), new Response(null, { status: 308 }), json(RAW)]);
    await uploadDriveFile(s.ctx, 'P', bytes(CH + 10), { chunkBytes: CH });
    expect(s.calls[2].headers.get('Content-Range')).toBe(`bytes ${CH}-${CH + 9}/${CH + 10}`);
  });

  it('Google chỉ nhận một phần đoạn thì gửi tiếp từ chỗ đó', async () => {
    const CH = 256 * 1024;
    const s = setup([initReply(), new Response(null, { status: 308, headers: { Range: 'bytes=0-1023' } }), json(RAW)]);
    await uploadDriveFile(s.ctx, 'P', bytes(CH), { chunkBytes: CH });
    expect(s.calls[2].headers.get('Content-Range')).toBe(`bytes 1024-${CH - 1}/${CH}`);
  });

  it('mất mạng giữa chừng: hỏi Google đã nhận tới đâu rồi gửi tiếp, không gửi lại từ đầu', async () => {
    const CH = 256 * 1024;
    const s = setup([
      initReply(),
      new TypeError('Failed to fetch'),
      new Response(null, { status: 308, headers: { Range: `bytes=0-${CH - 1}` } }), // trả lời câu hỏi "đã nhận tới đâu"
      json(RAW),
    ]);
    await uploadDriveFile(s.ctx, 'P', bytes(CH + 500), { chunkBytes: CH });
    expect(s.calls[2].headers.get('Content-Range')).toBe(`bytes */${CH + 500}`);
    expect(s.calls[3].headers.get('Content-Range')).toBe(`bytes ${CH}-${CH + 499}/${CH + 500}`);
    expect(s.sleeps.length).toBe(1);
  });

  it('5xx giữa chừng cũng được thử lại; lỗi 4xx thì dừng và nói lý do', async () => {
    const CH = 256 * 1024;
    const retry = setup([initReply(), apiError(503, 'backendError'), new Response(null, { status: 308 }), json(RAW)]);
    await expect(uploadDriveFile(retry.ctx, 'P', bytes(100), { chunkBytes: CH })).resolves.toBeDefined();

    const stop = setup([initReply(), apiError(403, 'storageQuotaExceeded')]);
    await expect(uploadDriveFile(stop.ctx, 'P', bytes(100))).rejects.toMatchObject({ status: 403, reason: 'storageQuotaExceeded' });
  });

  it('mất mạng liên tục thì ném lỗi sau 3 lần thử', async () => {
    const s = setup([initReply(), ...Array.from({ length: 12 }, () => new TypeError('Failed to fetch') as Reply)]);
    await expect(uploadDriveFile(s.ctx, 'P', bytes(100))).rejects.toBeInstanceOf(TypeError);
  });

  it('hủy giữa chừng thì dừng ngay', async () => {
    const ac = new AbortController();
    ac.abort();
    const s = setup([initReply()]);
    await expect(uploadDriveFile(s.ctx, 'P', bytes(100), { signal: ac.signal })).rejects.toBeDefined();
  });

  it('thiếu địa chỉ phiên thì báo lỗi rõ', async () => {
    await expect(uploadDriveFile(setup([json({})]).ctx, 'P', bytes(10))).rejects.toThrow(/địa chỉ phiên/);
  });

  it('đoạn mặc định là 8 MiB', () => {
    expect(UPLOAD_CHUNK_BYTES).toBe(8 * 1024 * 1024);
  });
});
