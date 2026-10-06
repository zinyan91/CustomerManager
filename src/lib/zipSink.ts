import type { ZipSinkMode } from './dispatch/folderZipPlan';

interface SaveFileHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableStream<Uint8Array>>;
}

interface PickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<SaveFileHandle>;
}

/** Trình duyệt có hộp "Lưu thành" cho phép ghi thẳng ra đĩa (Chrome, Edge). */
export function hasNativeSavePicker(): boolean {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showSaveFilePicker === 'function';
}

function memorySink(fileName: string): WritableStream<Uint8Array> {
  const chunks: Uint8Array[] = [];
  return new WritableStream<Uint8Array>({
    write(chunk) {
      chunks.push(chunk);
    },
    close() {
      // Đóng = chốt tệp: tạo Blob rồi kích hoạt tải xuống
      const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}

/**
 * Mở nơi ghi tệp zip. PHẢI được gọi đồng bộ trong sự kiện click (trước mọi `await` khác):
 * hộp "Lưu thành" chỉ mở khi còn "user activation". Người dùng đóng hộp thì ném AbortError.
 */
export async function openZipSink(mode: Exclude<ZipSinkMode, 'too_large'>, fileName: string): Promise<WritableStream<Uint8Array>> {
  if (mode === 'memory') return memorySink(fileName);

  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) throw new Error('Trình duyệt này không có hộp lưu tệp.');
  const handle = await picker.call(window, {
    suggestedName: fileName,
    types: [{ description: 'Tệp ZIP', accept: { 'application/zip': ['.zip'] } }],
  });
  return handle.createWritable({ keepExistingData: false });
}
