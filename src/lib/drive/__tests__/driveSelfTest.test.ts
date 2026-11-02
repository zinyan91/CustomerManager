import { describe, expect, it } from 'vitest';
import { listDriveTree } from '../driveClient';
import { runDriveSelfTest, selfTestPassed } from '../driveSelfTest';
import { buildRepoEntries } from '../driveTree';
import { createFakeDrive } from './fakeDrive';

describe('runDriveSelfTest', () => {
  it('chạy đủ các bước thành công, báo dần từng bước, và dọn thư mục thử', async () => {
    const drive = createFakeDrive();
    const seen: string[] = [];
    const steps = await runDriveSelfTest(drive.ctx, (s) => seen.push(s.label), () => 1);

    expect(steps.map((s) => s.label)).toEqual([
      'Lấy quyền truy cập Google Drive', 'Mở thư mục cha của các kho', 'Tạo thư mục thử', 'Tải tệp thử lên', 'Tải về và đối chiếu nội dung',
      'Đổi tên tệp', 'Sao chép tệp', 'Tạo thư mục con', 'Di chuyển tệp', 'Xóa thư mục thử (vào thùng rác)',
    ]);
    expect(seen).toEqual(steps.map((s) => s.label));
    expect(selfTestPassed(steps)).toBe(true);
    expect(steps[0].detail).toBe('Quyền ghi');
    // Thư mục thử và mọi thứ trong đó đã vào thùng rác: Drive trở lại như cũ
    const left = buildRepoEntries(await listDriveTree(drive.ctx, drive.driveId), drive.driveId);
    expect(left).toEqual([]);
    expect(drive.byName('_kiem-tra-ket-noi-1')[0].trashed).toBe(true);
  });

  it('Drive có sẵn dữ liệu thì không đụng tới', async () => {
    const drive = createFakeDrive();
    const keep = drive.seedFolder('Kho chung');
    drive.seedFile('a.pdf', keep.id);
    await runDriveSelfTest(drive.ctx, undefined, () => 2);
    expect(buildRepoEntries(await listDriveTree(drive.ctx, drive.driveId), drive.driveId).map((e) => e.path)).toEqual(['Kho chung', 'Kho chung/a.pdf']);
  });

  it('chỉ có quyền đọc: dừng và nói rõ, không ghi gì', async () => {
    const drive = createFakeDrive();
    drive.ctx.getAccess = async () => ({ accessToken: 't', expiresAt: Date.now() + 3_600_000, access: 'read', rootFolderId: drive.driveId });
    const steps = await runDriveSelfTest(drive.ctx);
    expect(steps.map((s) => [s.label, s.ok])).toEqual([['Lấy quyền truy cập Google Drive', true], ['Quyền ghi', false]]);
    expect(drive.requests).toHaveLength(0);
    expect(selfTestPassed(steps)).toBe(false);
  });

  it('không lấy được quyền (Edge Function lỗi): dừng ở bước đầu, nêu nguyên thông điệp', async () => {
    const drive = createFakeDrive();
    drive.ctx.getAccess = async () => {
      throw new Error('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.');
    };
    const steps = await runDriveSelfTest(drive.ctx);
    expect(steps).toEqual([{ label: 'Lấy quyền truy cập Google Drive', ok: false, detail: 'Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.' }]);
  });

  it('tài khoản Google không đủ quyền khi tạo thư mục: dừng, nói rõ thiếu quyền sửa', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^POST \/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    const steps = await runDriveSelfTest(drive.ctx);
    expect(steps.map((s) => s.label)).toEqual(['Lấy quyền truy cập Google Drive', 'Mở thư mục cha của các kho', 'Tạo thư mục thử']);
    expect(steps[2]).toMatchObject({ ok: false, detail: expect.stringContaining('không có quyền sửa') });
    expect(selfTestPassed(steps)).toBe(false);
  });

  it('hỏng giữa chừng (tải lên): các bước sau không chạy nhưng thư mục thử vẫn được dọn', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^POST \/upload\/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }));
    const steps = await runDriveSelfTest(drive.ctx, undefined, () => 3);
    expect(steps.map((s) => [s.label, s.ok])).toEqual([
      ['Lấy quyền truy cập Google Drive', true], ['Mở thư mục cha của các kho', true], ['Tạo thư mục thử', true], ['Tải tệp thử lên', false],
      ['Xóa thư mục thử (vào thùng rác)', true],
    ]);
    expect(steps[3].detail).toMatch(/hết dung lượng/);
    expect(drive.byName('_kiem-tra-ket-noi-3')[0].trashed).toBe(true);
  });

  it('không dọn được thì nói rõ mã thư mục để người dùng tự xóa', async () => {
    const drive = createFakeDrive();
    // Ba lần PATCH theo thứ tự là đổi tên, di chuyển, đưa vào thùng rác: chỉ chặn lần cuối
    const original = drive.ctx.fetchFn!;
    let patches = 0;
    drive.ctx.fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'PATCH' && ++patches === 3) return new Response('', { status: 400, statusText: 'Bad Request' });
      return original(input, init);
    }) as typeof fetch;
    const steps = await runDriveSelfTest(drive.ctx, undefined, () => 4);
    const last = steps[steps.length - 1];
    expect(last).toMatchObject({ label: 'Dọn thư mục thử', ok: false });
    expect(last.detail).toMatch(/_kiem-tra-ket-noi-.*mã id\d+/);
  });
});

describe('runDriveSelfTest: thư mục cha của các kho', () => {
  it('My Drive (root) thì ghi rõ là My Drive', async () => {
    const drive = createFakeDrive('root');
    const steps = await runDriveSelfTest(drive.ctx, undefined, () => 3);
    expect(steps[1]).toEqual({ label: 'Mở thư mục cha của các kho', ok: true, detail: 'My Drive' });
  });

  it('không mở được thư mục (404): nói rõ secret cần kiểm và dừng, không ghi gì', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^GET \/drive\/v3\/files\/DRV$/, new Response(JSON.stringify({ error: { code: 404, message: 'File not found', errors: [{ reason: 'notFound' }] } }), { status: 404 }));
    const steps = await runDriveSelfTest(drive.ctx);
    expect(steps.map((s) => s.label)).toEqual(['Lấy quyền truy cập Google Drive', 'Mở thư mục cha của các kho']);
    expect(steps[1]).toMatchObject({ ok: false, detail: expect.stringContaining('GDRIVE_ROOT_FOLDER_ID') });
    expect(drive.requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  });

  it('lỗi khác 404 (ví dụ 403) giữ thông điệp của Google', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^GET \/drive\/v3\/files\/DRV$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    const steps = await runDriveSelfTest(drive.ctx);
    expect(steps[1]).toMatchObject({ ok: false, detail: expect.stringContaining('không có quyền sửa') });
  });
});

describe('fake Drive + client: tạo, sửa, xóa phản ánh đúng ở cây kho', () => {
  it('cây phản ánh thư mục, tệp tải lên, đổi tên, di chuyển và thùng rác', async () => {
    const drive = createFakeDrive();
    const root = drive.seedFolder('Kho chung');
    const a = drive.seedFolder('A', root.id);
    drive.seedFile('x.pdf', a.id);
    const entries = buildRepoEntries(await listDriveTree(drive.ctx, root.id), root.id);
    expect(entries.map((e) => e.path)).toEqual(['A', 'A/x.pdf']);
  });
});
