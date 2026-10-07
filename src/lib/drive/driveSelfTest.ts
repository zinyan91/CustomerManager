import {
  copyDriveFile, createDriveFolder, downloadDriveBlob, listAccessibleDrives, listDriveFiles, moveDriveFile, renameDriveFile, trashDriveFile,
  uploadDriveFile,
} from './driveClient';
import { DriveApiError, describeDriveError } from './driveErrors';
import type { DriveContext } from './driveTypes';

export interface SelfTestStep {
  label: string;
  ok: boolean;
  detail?: string;
}

const PAYLOAD = 'Kiểm tra kết nối Google Drive của Kho lưu trữ.';

/**
 * Không tìm thấy Shared Drive đã đặt: hỏi Google tài khoản dịch vụ đang thấy những Shared Drive nào để phân biệt
 * "chưa là thành viên của ổ nào" với "ID đã đặt không khớp ổ nào". Trả null khi không giải thích thêm được.
 */
async function diagnoseMissingDrive(ctx: DriveContext, configuredId: string): Promise<string | null> {
  let drives: Array<{ id: string; name: string }>;
  try {
    drives = await listAccessibleDrives(ctx);
  } catch {
    return null;
  }
  if (drives.length === 0) {
    return 'Tài khoản dịch vụ chưa là thành viên của Shared Drive nào. Vào Shared Drive, mở Quản lý thành viên và thêm email tài khoản dịch vụ với quyền Quản lý nội dung.';
  }
  if (drives.some((d) => d.id === configuredId)) return null;
  const seen = drives.map((d) => `${d.name} (${d.id})`).join('; ');
  return `ID Shared Drive đã đặt (${configuredId}) không khớp ổ nào. Tài khoản dịch vụ chỉ thấy: ${seen}. Đặt lại secret GDRIVE_SHARED_DRIVE_ID bằng ID đúng.`;
}

/**
 * Kiểm tra kết nối thật tới Shared Drive: lấy quyền, liệt kê, tạo thư mục, tải lên, tải về đối chiếu nội dung, đổi tên,
 * sao chép, di chuyển, rồi đưa thư mục thử vào thùng rác. Dừng ở bước đầu tiên hỏng, vẫn cố dọn thư mục thử.
 * `onStep` được gọi ngay khi mỗi bước xong để giao diện hiện dần.
 */
export async function runDriveSelfTest(ctx: DriveContext, onStep?: (step: SelfTestStep) => void, now: () => number = Date.now): Promise<SelfTestStep[]> {
  const steps: SelfTestStep[] = [];
  const record = (step: SelfTestStep) => {
    steps.push(step);
    onStep?.(step);
  };
  let rootId = '';
  let testFolderId: string | null = null;

  const run = async <T>(label: string, work: () => Promise<{ value: T; detail?: string }>): Promise<T | undefined> => {
    try {
      const { value, detail } = await work();
      record({ label, ok: true, detail });
      return value;
    } catch (err) {
      record({ label, ok: false, detail: describeDriveError(err, label) });
      return undefined;
    }
  };

  const access = await run('Lấy quyền truy cập Google Drive', async () => {
    const a = await ctx.getAccess();
    rootId = a.driveId;
    return { value: a, detail: a.access === 'write' ? 'Quyền ghi' : 'Chỉ quyền đọc' };
  });
  if (!access) return steps;
  if (access.access !== 'write') {
    record({ label: 'Quyền ghi', ok: false, detail: 'Tài khoản này chỉ có quyền đọc nên không kiểm tra được việc ghi.' });
    return steps;
  }

  const listed = await run('Liệt kê Shared Drive', async () => {
    try {
      const files = await listDriveFiles(ctx);
      return { value: files, detail: `${files.length} mục` };
    } catch (err) {
      // Google trả 404 cho cả hai lỗi cấu hình phổ biến (ID sai, chưa là thành viên) nên hỏi thêm để nói rõ lỗi nào
      if (err instanceof DriveApiError && err.status === 404) {
        const why = await diagnoseMissingDrive(ctx, rootId);
        if (why) throw new Error(why);
      }
      throw err;
    }
  });

  let ok = listed !== undefined;
  const folder = ok
    ? await run('Tạo thư mục thử', async () => {
        const f = await createDriveFolder(ctx, rootId, `_kiem-tra-ket-noi-${now()}`);
        testFolderId = f.id;
        return { value: f, detail: f.name };
      })
    : undefined;
  ok = ok && folder !== undefined;

  const uploaded = ok
    ? await run('Tải tệp thử lên', async () => {
        const f = await uploadDriveFile(ctx, folder!.id, new File([PAYLOAD], 'thu.txt', { type: 'text/plain' }));
        return { value: f, detail: `${f.size} byte` };
      })
    : undefined;
  ok = ok && uploaded !== undefined;

  const downloaded = ok
    ? await run('Tải về và đối chiếu nội dung', async () => {
        const text = await (await downloadDriveBlob(ctx, uploaded!.id)).text();
        if (text !== PAYLOAD) throw new Error('Nội dung tải về khác nội dung đã tải lên.');
        return { value: true };
      })
    : undefined;
  ok = ok && downloaded !== undefined;

  const renamed = ok
    ? await run('Đổi tên tệp', async () => ({ value: await renameDriveFile(ctx, uploaded!.id, 'thu-doi-ten.txt'), detail: 'thu-doi-ten.txt' }))
    : undefined;
  ok = ok && renamed !== undefined;

  const copied = ok
    ? await run('Sao chép tệp', async () => ({ value: await copyDriveFile(ctx, uploaded!.id, folder!.id, 'thu-ban-sao.txt'), detail: 'thu-ban-sao.txt' }))
    : undefined;
  ok = ok && copied !== undefined;

  const sub = ok ? await run('Tạo thư mục con', async () => ({ value: await createDriveFolder(ctx, folder!.id, 'con'), detail: 'con' })) : undefined;
  ok = ok && sub !== undefined;

  const moved = ok ? await run('Di chuyển tệp', async () => ({ value: await moveDriveFile(ctx, copied!.id, folder!.id, sub!.id), detail: 'con/thu-ban-sao.txt' })) : undefined;
  ok = ok && moved !== undefined;

  if (testFolderId) {
    const id = testFolderId;
    const cleaned = await run('Xóa thư mục thử (vào thùng rác)', async () => {
      await trashDriveFile(ctx, id);
      return { value: true };
    });
    if (cleaned === undefined) {
      record({ label: 'Dọn thư mục thử', ok: false, detail: `Hãy tự xóa thư mục "_kiem-tra-ket-noi-..." (mã ${id}) trong Shared Drive.` });
    }
  }
  return steps;
}

export const selfTestPassed = (steps: readonly SelfTestStep[]): boolean => steps.length > 0 && steps.every((s) => s.ok);
