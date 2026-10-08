// Đủ lâu để trình quản lý tải xuống của trình duyệt đọc xong blob.
const KEEP_DOWNLOAD_URL_MS = 60_000;

/** Ký tự mà hệ thống tệp phổ biến nào cũng không nhận trong tên tệp. */
const safeName = (filename: string) => filename.replace(/[<>:"/\\|?*]/g, '_');

/**
 * Chrome trên Windows đổi tên tệp tải xuống thành UUID nếu liên kết thiếu thuộc tính `download`
 * hoặc không nằm trong tài liệu lúc bấm.
 */
function saveWithAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', filename);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, KEEP_DOWNLOAD_URL_MS);
}

/** Tải tệp đã tạo xuống máy. Chỉ gọi từ một cú bấm của người dùng. */
export function saveDocument(blob: Blob, filename: string): void {
  saveWithAnchor(blob, safeName(filename));
}

const PRINT_CLEANUP_FALLBACK_MS = 60_000;

/** Tải tệp xuống máy; trùng với saveDocument, giữ riêng cho chỗ chỉ "tải xuống" chứ không "lưu tài liệu". */
export function downloadBlob(blob: Blob, filename: string): void {
  saveWithAnchor(blob, safeName(filename));
}

/**
 * Mở hộp thoại in của trình duyệt cho một trang HTML nằm trong blob. Khung ẩn đặt ngoài màn hình
 * thay vì `display: none` vì Chrome không in từ khung chưa từng được dàn trang.
 */
export function printBlob(blob: Blob): void {
  const printUrl = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;left:-9999px;top:-9999px';
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    URL.revokeObjectURL(printUrl);
    iframe.remove();
  };
  iframe.onload = () => {
    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    iframe.contentWindow?.print();
    setTimeout(cleanup, PRINT_CLEANUP_FALLBACK_MS);
  };
  iframe.src = printUrl;
  document.body.appendChild(iframe);
}
