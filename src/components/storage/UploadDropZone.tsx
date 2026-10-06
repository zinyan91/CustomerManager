import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';
import { itemsFromDataTransfer, type UploadItem } from '../../lib/uploadItems';

interface UploadDropZoneProps {
  /** Tắt khi người dùng không có quyền tải lên vào repo đang chọn. */
  disabled?: boolean;
  onItems: (items: UploadItem[]) => void;
  children: ReactNode;
  className?: string;
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** Bọc một vùng để nhận tệp/thư mục kéo thả từ máy vào. */
export function UploadDropZone({ disabled = false, onItems, children, className = '' }: UploadDropZoneProps) {
  const [over, setOver] = useState(false);
  // dragenter/dragleave bắn lặp khi đi qua phần tử con nên đếm độ sâu để không nhấp nháy
  const depth = useRef(0);

  const handleEnter = (e: DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setOver(true);
  };

  const handleLeave = (e: DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setOver(false);
  };

  const handleOver = (e: DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    if (disabled) return;
    // Phải gọi ngay trong sự kiện: DataTransfer chỉ hợp lệ trước khi handler kết thúc
    void itemsFromDataTransfer(e.dataTransfer).then((items) => {
      if (items.length > 0) onItems(items);
    });
  };

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleEnter}
      onDragLeave={handleLeave}
      onDragOver={handleOver}
      onDrop={handleDrop}
    >
      {children}
      {over && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-500 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 pointer-events-none"
          role="status"
        >
          <UploadCloud className="w-10 h-10" />
          <span className="text-base font-semibold">Thả tệp hoặc thư mục vào đây để tải lên</span>
        </div>
      )}
    </div>
  );
}
