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
