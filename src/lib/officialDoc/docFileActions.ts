import type { OfficialDocFile } from '../../types/officialDoc';
import { fetchDocFileBlob } from './docFiles';
import { zipBlobs } from './formBundle';

const REVOKE_AFTER_MS = 60_000;

const keepUrlAlive = (url: string) => setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  keepUrlAlive(url);
}

/** Tải tệp từ Kho về máy. Ném lỗi tiếng Việt khi hỏng. */
export async function downloadDocFile(file: OfficialDocFile): Promise<void> {
  saveBlob(await fetchDocFileBlob(file), file.name);
}

/**
 * Tải nhiều tệp của một văn bản về dạng một ZIP, để không phải bấm từng tệp. Tải từng tệp thẳng từ
 * Kho rồi nén trên trình duyệt; một tệp lỗi thì dừng và nói rõ tệp nào, không đưa ZIP thiếu.
 */
export async function downloadDocFilesZip(files: OfficialDocFile[], zipName: string): Promise<void> {
  const inputs = [];
  for (const file of files) inputs.push({ name: file.name, blob: await fetchDocFileBlob(file) });
  saveBlob(await zipBlobs(inputs), zipName);
}

/**
 * Mở tệp (PDF, ảnh) trong tab mới. Tab phải mở ngay trong sự kiện click, trước mọi await,
 * kẻo trình duyệt chặn cửa sổ bật lên; tải hỏng thì đóng tab trống đó.
 */
export async function viewDocFile(file: OfficialDocFile): Promise<void> {
  const tab = window.open('', '_blank');
  if (!tab) throw new Error('Trình duyệt đã chặn tab mới. Cho phép cửa sổ bật lên hoặc bấm "Tải về".');
  try {
    const url = URL.createObjectURL(await fetchDocFileBlob(file));
    tab.location.href = url;
    keepUrlAlive(url);
  } catch (err) {
    tab.close();
    throw err;
  }
}
