import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud } from 'lucide-react';
import { itemsFromDataTransfer, type UploadItem } from '../../lib/uploadItems';

interface UploadDropZoneProps {
  /** Tắt khi người dùng không có quyền tải lên vào repo đang chọn. */
  disabled?: boolean;
  onItems: (items: UploadItem[]) => void;
  /** Chuột phải vào vùng nền (không phải một mục) để mở menu dán. */
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
  children: ReactNode;
  className?: string;
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Nhận tệp/thư mục kéo thả từ máy vào ở bất kỳ đâu trên trang, kể cả khi danh sách đang cuộn xuống: lắng nghe ở cấp tài liệu
 * và lớp phủ cố định theo khung nhìn (không nằm trong phần cuộn). Chỗ nào đã tự nhận tệp (vd: khung chat AI, đã gọi
 * preventDefault) thì bỏ qua để không tải nhầm.
 */
export function UploadDropZone({ disabled = false, onItems, onContextMenu, children, className = '' }: UploadDropZoneProps) {
  const [over, setOver] = useState(false);
  const onItemsRef = useRef(onItems);
  onItemsRef.current = onItems;

  useEffect(() => {
    if (disabled) return;
    // dragenter/dragleave bắn lặp khi đi qua phần tử con nên đếm độ sâu để không nhấp nháy
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (e.defaultPrevented || !hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const dragOver = (e: DragEvent) => {
      if (e.defaultPrevented || !hasFiles(e)) return;
      // Không chặn mặc định thì trình duyệt mở tệp thả vào thay vì để trang xử lý
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = 0;
      setOver(false);
      if (e.defaultPrevented) return;
      e.preventDefault();
      // Phải gọi ngay trong sự kiện: DataTransfer chỉ hợp lệ trước khi handler kết thúc
      void itemsFromDataTransfer(e.dataTransfer!).then((items) => {
        if (items.length > 0) onItemsRef.current(items);
      });
    };
    document.addEventListener('dragenter', enter);
    document.addEventListener('dragleave', leave);
    document.addEventListener('dragover', dragOver);
    document.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('dragenter', enter);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('dragover', dragOver);
      document.removeEventListener('drop', drop);
      setOver(false);
    };
  }, [disabled]);

  return (
    <div className={`relative ${className}`} onContextMenu={onContextMenu}>
      {children}
      {over &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 pointer-events-none"
            role="status"
          >
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-500 bg-white dark:bg-slate-900 px-10 py-8 text-slate-800 dark:text-slate-100">
              <UploadCloud className="w-10 h-10" />
              <span className="text-base font-semibold">Thả tệp hoặc thư mục vào đây để tải lên</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
