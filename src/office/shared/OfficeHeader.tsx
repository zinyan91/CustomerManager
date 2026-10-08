import React from 'react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTE_OF } from '../../lib/routes';
import { useOfficeI18n } from '../i18n';

export interface OfficeHeaderProps {
  onHome: () => void;
  /** Giữa biểu tượng và các nút: tên tài liệu. */
  children?: React.ReactNode;
  /** Trước nút "Về ứng dụng": nút tải xuống. */
  actions?: React.ReactNode;
}

/** Thanh trên cùng của mọi trang Báo cáo: biểu tượng về trang chủ Báo cáo, giữa là của trang, phải là nút về ứng dụng. */
export const OfficeHeader: React.FC<OfficeHeaderProps> = ({ onHome, children, actions }) => {
  const { m } = useOfficeI18n();
  return (
    <header className="office-header">
      <button type="button" className="office-header-home" onClick={onHome} aria-label={m.app.home}>
        <FileSpreadsheet size={22} />
        {!children && <span className="office-header-name">{m.app.title}</span>}
      </button>
      <div className="office-header-main">{children}</div>
      <div className="office-header-actions">
        {actions}
        <Link className="office-header-link" to={ROUTE_OF.dashboard}>
          <ArrowLeft size={14} />
          <span>{m.app.backToApp}</span>
        </Link>
      </div>
    </header>
  );
};
