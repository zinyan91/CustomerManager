import type { OfficialDocFile } from '../../types/officialDoc';
import { fetchDocFileBlob } from './docFiles';

const REVOKE_AFTER_MS = 60_000;

const keepUrlAlive = (url: string) => setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);

/** Tải tệp từ Kho về máy. Ném lỗi tiếng Việt khi hỏng. */
export async function downloadDocFile(file: OfficialDocFile, token: string): Promise<void> {
  const url = URL.createObjectURL(await fetchDocFileBlob(file, token));
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  keepUrlAlive(url);
}

/**
 * Mở tệp (PDF, ảnh) trong tab mới. Tab phải mở ngay trong sự kiện click, trước mọi await,
 * kẻo trình duyệt chặn cửa sổ bật lên; tải hỏng thì đóng tab trống đó.
 */
export async function viewDocFile(file: OfficialDocFile, token: string): Promise<void> {
  const tab = window.open('', '_blank');
  if (!tab) throw new Error('Trình duyệt đã chặn tab mới. Cho phép cửa sổ bật lên hoặc bấm "Tải về".');
  try {
    const url = URL.createObjectURL(await fetchDocFileBlob(file, token));
    tab.location.href = url;
    keepUrlAlive(url);
  } catch (err) {
    tab.close();
    throw err;
  }
}
