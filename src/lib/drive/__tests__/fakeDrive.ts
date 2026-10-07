import type { DriveContext } from '../driveTypes';

interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  bytes: Uint8Array;
  createdTime: string;
}

const FOLDER = 'application/vnd.google-apps.folder';

/** Google Drive giả trong bộ nhớ, đủ các lệnh ứng dụng dùng: liệt kê, tìm thư mục con, tạo, tải lên resumable, tải về, đổi tên, di chuyển, sao chép, thùng rác. */
export function createFakeDrive(driveId = 'DRV') {
  const files = new Map<string, FakeFile>();
  const sessions = new Map<string, { name: string; parents: string[]; type: string; total: number; received: Uint8Array[] }>();
  let seq = 0;
  /** Các Shared Drive mà tài khoản dịch vụ giả là thành viên (mặc định chỉ ổ đang dùng). */
  const accessibleDrives: Array<{ id: string; name: string }> = [{ id: driveId, name: 'Shared Drive thử' }];
  const requests: Array<{ method: string; url: string; body?: string }> = [];
  const failNext: Array<{ match: RegExp; response: Response }> = [];

  const add = (name: string, parents: string[], mimeType: string, bytes: Uint8Array = new Uint8Array()): FakeFile => {
    const f: FakeFile = { id: `id${++seq}`, name, mimeType, parents, trashed: false, bytes, createdTime: new Date(2026, 9, 1, 0, 0, seq).toISOString() };
    files.set(f.id, f);
    return f;
  };
  const view = (f: FakeFile) => ({
    id: f.id, name: f.name, mimeType: f.mimeType, size: String(f.bytes.length), parents: f.parents, modifiedTime: f.createdTime, createdTime: f.createdTime,
  });
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  const notFound = () => json({ error: { code: 404, message: 'File not found', errors: [{ reason: 'notFound' }] } }, 404);

  const live = (f: FakeFile): boolean => !f.trashed && (f.parents.every((p) => !files.has(p) || live(files.get(p)!)) || f.parents.length === 0);

  async function handle(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? init.body : undefined;
    requests.push({ method, url: url.toString(), body });

    const injected = failNext.findIndex((f) => f.match.test(`${method} ${url.pathname}`));
    if (injected >= 0) return failNext.splice(injected, 1)[0].response;

    // Phiên tải lên: PUT vào địa chỉ phiên
    if (method === 'PUT' && url.pathname === '/upload/session') {
      const session = sessions.get(url.searchParams.get('id') ?? '');
      if (!session) return notFound();
      const range = new Headers(init.headers).get('Content-Range') ?? '';
      const part = init.body as Blob | undefined;
      const bytes = part ? new Uint8Array(await part.arrayBuffer()) : new Uint8Array();
      const m = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
      if (!m) return new Response(null, { status: 308 });
      session.received.push(bytes);
      const sent = session.received.reduce((n, c) => n + c.length, 0);
      if (sent < session.total) return new Response(null, { status: 308, headers: { Range: `bytes=0-${sent - 1}` } });
      const all = new Uint8Array(sent);
      let o = 0;
      for (const c of session.received) { all.set(c, o); o += c.length; }
      return json(view(add(session.name, session.parents, session.type, all)));
    }

    const path = url.pathname;
    if (method === 'GET' && path === '/drive/v3/drives') return json({ drives: accessibleDrives });
    if (method === 'POST' && path === '/upload/drive/v3/files') {
      const meta = JSON.parse(body ?? '{}') as { name: string; parents: string[] };
      const id = `s${++seq}`;
      sessions.set(id, {
        name: meta.name, parents: meta.parents,
        type: new Headers(init.headers).get('X-Upload-Content-Type') ?? 'application/octet-stream',
        total: Number(new Headers(init.headers).get('X-Upload-Content-Length') ?? 0), received: [],
      });
      return new Response('{}', { status: 200, headers: { Location: `https://upload.test/upload/session?id=${id}` } });
    }

    const fileMatch = path.match(/^\/drive\/v3\/files\/([^/]+)(\/copy|\/export)?$/);
    if (path === '/drive/v3/files') {
      if (method === 'GET') {
        const q = url.searchParams.get('q') ?? '';
        const parent = q.match(/'([^']+)' in parents/)?.[1];
        const name = q.match(/name = '((?:[^'\\]|\\.)*)'/)?.[1]?.replace(/\\(.)/g, '$1');
        const wantFolder = q.includes(FOLDER);
        const list = [...files.values()].filter(
          (f) => live(f) && (!parent || f.parents.includes(parent)) && (name === undefined || f.name === name) && (!wantFolder || f.mimeType === FOLDER),
        );
        return json({ files: list.map(view) });
      }
      if (method === 'POST') {
        const meta = JSON.parse(body ?? '{}') as { name: string; mimeType?: string; parents: string[] };
        return json(view(add(meta.name, meta.parents, meta.mimeType ?? 'application/octet-stream')));
      }
    }
    if (fileMatch) {
      const f = files.get(decodeURIComponent(fileMatch[1]));
      if (!f || !live(f)) return notFound();
      if (method === 'GET' && url.searchParams.get('alt') === 'media') return new Response(f.bytes as BlobPart);
      if (method === 'GET') return json(view(f));
      if (method === 'POST' && fileMatch[2] === '/copy') {
        const meta = JSON.parse(body ?? '{}') as { name: string; parents: string[] };
        return json(view(add(meta.name, meta.parents, f.mimeType, f.bytes)));
      }
      if (method === 'PATCH') {
        const meta = JSON.parse(body ?? '{}') as { name?: string; trashed?: boolean };
        if (meta.name !== undefined) f.name = meta.name;
        if (meta.trashed) f.trashed = true;
        const add1 = url.searchParams.get('addParents');
        const rem = url.searchParams.get('removeParents');
        if (add1) f.parents = [...f.parents.filter((p) => p !== rem), add1];
        return json(view(f));
      }
    }
    return json({ error: { code: 400, message: `Fake Drive chưa hỗ trợ ${method} ${path}` } }, 400);
  }

  const ctx: DriveContext = {
    getAccess: async () => ({ accessToken: 'fake-token', expiresAt: Date.now() + 3_600_000, access: 'write', driveId }),
    invalidate: () => {},
    fetchFn: handle as unknown as typeof fetch,
    sleep: async () => {},
  };

  return {
    ctx,
    files,
    requests,
    driveId,
    accessibleDrives,
    /** Tạo sẵn thư mục hay tệp (cha mặc định là gốc Shared Drive). */
    seedFolder: (name: string, parent = driveId) => add(name, [parent], FOLDER),
    seedFile: (name: string, parent: string, text = 'noi dung', mimeType = 'application/pdf') => add(name, [parent], mimeType, new TextEncoder().encode(text)),
    /** Lần gọi kế tiếp khớp "METHOD /path" sẽ nhận phản hồi này. */
    failNext: (match: RegExp, response: Response) => void failNext.push({ match, response }),
    live: (id: string) => (files.has(id) ? live(files.get(id)!) : false),
    byName: (name: string) => [...files.values()].filter((f) => f.name === name),
  };
}
