import React, { useState } from 'react';
import { Archive, FolderOpen, Save } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import type { DriveLink } from '../archive/officeArchive';

/** Mở: tệp từ máy, tệp từ Kho lưu trữ; `children` là danh sách gần đây. */
export const OpenPanel: React.FC<{ onOpenDevice: () => void; onOpenFromArchive: () => void; children?: React.ReactNode }> = ({ onOpenDevice, onOpenFromArchive, children }) => {
  const t = useOfficeI18n().m.ribbon.backstage;
  return (
    <>
      <button type="button" className="wr-text-btn is-primary" onClick={onOpenDevice}>
        <FolderOpen size={16} />
        {t.openFromDevice}
      </button>
      <button type="button" className="wr-text-btn calc-open-archive" onClick={onOpenFromArchive}>
        <Archive size={16} />
        {t.openFromArchive}
      </button>
      {children}
    </>
  );
};

/** Lưu: bản nháp trong trình duyệt và Kho lưu trữ (lưu lại ghi đè tệp đã gắn, hoặc chọn vị trí khác). */
export const SavePanel: React.FC<{
  archiveLink: DriveLink | null;
  onSaveNow: () => Promise<void>;
  onSaveToArchive: () => Promise<void>;
  onSaveToArchiveAs: () => void;
}> = ({ archiveLink, onSaveNow, onSaveToArchive, onSaveToArchiveAs }) => {
  const t = useOfficeI18n().m.ribbon.backstage;
  const [saved, setSaved] = useState(false);
  return (
    <div className="calc-save">
      <button
        type="button"
        className="wr-text-btn is-primary"
        onClick={() => {
          void onSaveNow().then(() => setSaved(true));
        }}
      >
        <Save size={16} />
        {t.saveNow}
      </button>
      <button type="button" className="wr-text-btn is-primary" onClick={() => void onSaveToArchive()}>
        <Archive size={16} />
        {t.saveToArchive}
        {archiveLink ? ` (${archiveLink.path})` : ''}
      </button>
      {archiveLink && (
        <button type="button" className="wr-text-btn" onClick={onSaveToArchiveAs}>
          {t.saveToArchiveAs}
        </button>
      )}
      {saved && (
        <p role="status" className="calc-dialog-text">
          {t.saved}
        </p>
      )}
    </div>
  );
};

/** Thông tin tài liệu: danh sách tên và giá trị. */
export const InfoList: React.FC<{ rows: Array<[string, string]> }> = ({ rows }) => (
  <dl className="calc-info">
    {rows.map(([label, value]) => (
      <React.Fragment key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

/** Một lựa chọn tải xuống ở "Lưu thành". */
export const SaveAsOption: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button type="button" className="calc-save-option" onClick={onClick}>
    {icon}
    <span>{label}</span>
  </button>
);
