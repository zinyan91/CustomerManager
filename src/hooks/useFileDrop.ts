import { useCallback, useRef, useState } from 'react';
import { itemsFromDataTransfer, type UploadItem } from '../lib/uploadItems';

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Vùng nhận tệp kéo thả. `isDragging` bật khi đang kéo tệp qua vùng; thả thì gọi onItems với tệp kèm đường dẫn
 * trong thư mục (đọc cả thư mục thả vào). Đọc thư mục là bất đồng bộ nên onItems nhận một Promise để nơi dùng báo lỗi.
 */
export function useFileDrop(onItems: (items: Promise<UploadItem[]>) => void) {
  const [isDragging, setIsDragging] = useState(false);
  // Con trong vùng bắn dragenter/dragleave liên tục nên phải đếm để không nhấp nháy
  const depth = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      // Phải gọi ngay trong sự kiện: danh sách mục thả chỉ hợp lệ lúc này
      onItems(itemsFromDataTransfer(e.dataTransfer));
    },
    [onItems]
  );

  return { isDragging, dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
