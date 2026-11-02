import {
  copyDriveFile, createDriveFolder, downloadDriveBlob, getDriveFile, moveDriveFile, renameDriveFile, trashDriveFile, uploadDriveFile,
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
 * Kiểm tra kết nối thật tới Google Drive: lấy quyền, mở thư mục cha của các kho, tạo thư mục, tải lên, tải về đối chiếu nội dung, đổi tên,
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
    rootId = a.rootFolderId;
    return { value: a, detail: a.access === 'write' ? 'Quyền ghi' : 'Chỉ quyền đọc' };
  });
  if (!access) return steps;
  if (access.access !== 'write') {
    record({ label: 'Quyền ghi', ok: false, detail: 'Tài khoản này chỉ có quyền đọc nên không kiểm tra được việc ghi.' });
    return steps;
  }

  const listed = await run('Mở thư mục cha của các kho', async () => {
    try {
      const folder = await getDriveFile(ctx, rootId);
      return { value: folder, detail: rootId === 'root' ? 'My Drive' : folder.name };
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 404) {
        throw new Error(`Không mở được thư mục ${rootId}. Kiểm tra secret GDRIVE_ROOT_FOLDER_ID và việc tài khoản Google của ứng dụng có quyền với thư mục đó.`);
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
      record({ label: 'Dọn thư mục thử', ok: false, detail: `Hãy tự xóa thư mục "_kiem-tra-ket-noi-..." (mã ${id}) trên Google Drive.` });
    }
  }
  return steps;
}

export const selfTestPassed = (steps: readonly SelfTestStep[]): boolean => steps.length > 0 && steps.every((s) => s.ok);
