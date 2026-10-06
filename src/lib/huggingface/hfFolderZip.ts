import type { FolderZipPlan, ZipEntry } from '../dispatch/folderZipPlan';
import { hfFileUrl } from './hfClient';

export interface ZipProgress {
  completed: number;
  total: number;
  loadedBytes: number;
  totalBytes: number;
  currentName: string;
}

export interface ZipDownloadOptions {
  plan: FolderZipPlan;
  repoId: string;
  token: string;
  /** Nơi ghi tệp zip: hộp "Lưu thành" của trình duyệt hoặc bộ đệm bộ nhớ. */
  writable: WritableStream<Uint8Array>;
  signal?: AbortSignal;
  onProgress?: (progress: ZipProgress) => void;
  /** Zip đã đủ và hợp lệ; bước kế tiếp là chốt tệp. Sau điểm này không hủy được nữa. */
  onCommitting?: () => void;
  fetchFn?: typeof fetch;
}

const STALL_MS = 90_000;

const abortError = () => new DOMException('Đã hủy tải thư mục.', 'AbortError');
const stallError = () => new Error('Hugging Face không phản hồi. Kiểm tra mạng rồi thử lại.');

export function isAbortError(reason: unknown): boolean {
  return typeof reason === 'object' && reason !== null && 'name' in reason && (reason as { name: string }).name === 'AbortError';
}

function describeStatus(status: number, name: string): string {
  if (status === 401 || status === 403) return `Token Hugging Face bị từ chối khi tải "${name}" (${status}).`;
  if (status === 404) return `Không tìm thấy tệp "${name}" trên Hugging Face (có thể đã bị xóa).`;
  return `Không tải được tệp "${name}" từ Hugging Face (${status}).`;
}

/**
 * Nén thư mục thành ZIP (STORE, không nén lại vì PDF/ảnh vốn đã nén) ngay trên trình duyệt
 * và ghi thẳng ra `writable`. Chỉ một tệp được mở tại một thời điểm nên không gom cả thư mục
 * vào RAM. Lỗi hoặc hủy thì hủy luôn đích ghi để không để lại tệp zip dở.
 */
export async function downloadFolderZip(options: ZipDownloadOptions): Promise<void> {
  const { plan, repoId, token, writable, signal: outer, onProgress, onCommitting } = options;
  const doFetch = options.fetchFn ?? fetch;

  const controller = new AbortController();
  const link = () => controller.abort(outer?.reason ?? abortError());
  outer?.addEventListener('abort', link, { once: true });

  const output = writable.getWriter();
  let committing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const armStall = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(stallError()), STALL_MS);
  };
  const disarmStall = () => clearTimeout(timer);

  try {
    if (outer?.aborted) throw abortError();
    const signal = controller.signal;
    const { ZipWriter } = await import('@zip.js/zip.js');
    signal.throwIfAborted();

    // zip.js chỉ lo khung ZIP; việc chốt tệp (output.close) do ta quyết định sau khi mọi kiểm tra đạt.
    const zip = new ZipWriter(
      new WritableStream<Uint8Array>({
        write: (chunk) => output.write(chunk),
        close: () => undefined,
        abort: (reason) => output.abort(reason),
      }),
      { level: 0, zip64: true, bufferedWrite: false, dataDescriptor: true, useWebWorkers: false }
    );

    let completed = 0;
    let loadedBytes = 0;
    let currentName = '';
    const report = () =>
      onProgress?.({ completed, total: plan.entries.length, loadedBytes, totalBytes: plan.totalBytes, currentName });
    report();

    const openEntry = async (entry: ZipEntry): Promise<Response> => {
      armStall();
      let response: Response;
      try {
        response = await doFetch(hfFileUrl(repoId, entry.filePath), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal,
        });
      } finally {
        disarmStall();
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(describeStatus(response.status, entry.zipPath));
      }
      return response;
    };

    for (const entry of plan.entries) {
      signal.throwIfAborted();
      currentName = entry.zipPath;
      report();

      const response = await openEntry(entry);
      let received = 0;
      armStall();
      const checked = response.body!.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctl) {
            received += chunk.byteLength;
            loadedBytes += chunk.byteLength;
            armStall();
            report();
            ctl.enqueue(chunk);
          },
          flush() {
            disarmStall();
            // Chỉ bắt tải thiếu: kích thước trong cây HF có thể lệch nhẹ nên không bắt tải dư.
            if (received < entry.size) {
              throw new Error(`Tệp "${entry.zipPath}" tải về chưa đủ (${received}/${entry.size} byte). Hãy thử lại.`);
            }
          },
        })
      );

      const modified = new Date(entry.modifiedAt);
      // Mọi lệnh add phải tuần tự; chạy song song sẽ khiến zip.js gom cả tệp vào bộ nhớ.
      await zip.add(entry.zipPath, checked, {
        signal,
        lastModDate: Number.isFinite(modified.getTime()) ? modified : new Date(0),
      });
      completed += 1;
      report();
    }

    signal.throwIfAborted();
    await zip.close();
    signal.throwIfAborted();
    onCommitting?.();
    committing = true;
    await output.close();
  } catch (error) {
    controller.abort(error);
    // Đã bắt đầu chốt tệp thì không thể hủy đáng tin cậy; để trình duyệt tự báo kết quả.
    if (!committing) await output.abort(error).catch(() => undefined);
    // Người dùng hủy thì báo AbortError; còn lại giữ nguyên lỗi cụ thể (token, tệp đã xóa, mạng...)
    if (outer?.aborted) throw abortError();
    throw error instanceof Error ? error : new Error('Không thể hoàn tất tệp ZIP. Vui lòng thử lại.');
  } finally {
    disarmStall();
    outer?.removeEventListener('abort', link);
    try {
      output.releaseLock();
    } catch {
      // Khóa đã được giải phóng khi abort/close; không còn gì để làm.
    }
  }
}
