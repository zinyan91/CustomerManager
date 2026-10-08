import React, { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

export interface BackstageNavItem<Id extends string> {
  id: Id;
  label: string;
  icon: React.ReactNode;
}

export interface BackstageShellProps<Id extends string> {
  items: Array<BackstageNavItem<Id>>;
  section: Id;
  onSection: (id: Id) => void;
  ariaLabel: string;
  backLabel: string;
  closeLabel: string;
  /** Về ứng dụng chủ (Báo cáo). */
  onHome: () => void;
  /** Quay lại tài liệu đang mở. */
  onClose: () => void;
  /** Kết quả của lần lưu/mở gần nhất: lỗi và thành công. */
  problem?: string | null;
  notice?: string | null;
  children: React.ReactNode;
}

/** Khung màn "Tệp" toàn khung như backstage của Office: danh mục bên trái, nội dung bên phải; Esc hoặc mũi tên để quay lại. */
export function BackstageShell<Id extends string>({ items, section, onSection, ariaLabel, backLabel, closeLabel, onHome, onClose, problem, notice, children }: BackstageShellProps<Id>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="calc-backstage" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <nav className="calc-backstage-nav" aria-label={ariaLabel}>
        <button type="button" className="calc-backstage-back" onClick={onClose} aria-label={backLabel} title={backLabel}>
          <ArrowLeft size={18} />
        </button>
        {items.map(({ id, label, icon }) => (
          <button key={id} type="button" className={`calc-backstage-item${section === id ? ' is-active' : ''}`} onClick={() => onSection(id)}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="calc-backstage-item is-close" onClick={onHome}>
          <X size={18} />
          <span>{closeLabel}</span>
        </button>
      </nav>
      <div className="calc-backstage-panel">
        <h2>{items.find((item) => item.id === section)?.label}</h2>
        {problem && (
          <p role="alert" className="calc-backstage-note is-problem">
            {problem}
          </p>
        )}
        {notice && (
          <p role="status" className="calc-backstage-note">
            {notice}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
