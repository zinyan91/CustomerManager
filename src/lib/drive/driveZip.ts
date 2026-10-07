import type { ZipEntry } from '../dispatch/folderZipPlan';
import type { OpenZipEntry } from '../huggingface/hfFolderZip';
import { openDriveDownload } from './driveClient';
import { describeDriveError } from './driveErrors';
import type { DriveContext } from './driveTypes';

/** Hàm mở từng tệp Drive để nén ZIP. Tệp thiếu mã hoặc Drive báo lỗi thì ném thông điệp tiếng Việt nêu rõ tệp nào. */
export function driveOpenEntry(ctx: DriveContext): OpenZipEntry {
  return async (entry: ZipEntry, signal: AbortSignal) => {
    if (!entry.fileId) throw new Error(`Tệp "${entry.zipPath}" thiếu mã tệp Google Drive.`);
    try {
      return await openDriveDownload(ctx, entry.fileId, entry.nativeMimeType ?? '', signal);
    } catch (err) {
      if (signal.aborted) throw err;
      throw new Error(describeDriveError(err, `Tải "${entry.zipPath}"`));
    }
  };
}
