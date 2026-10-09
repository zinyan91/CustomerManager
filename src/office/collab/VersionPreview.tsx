import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CalcController } from '../calc/controller';
import { CalcGrid } from '../calc/components/CalcGrid';
import { useOfficeI18n } from '../i18n';
import { getVersionData } from './collabApi';

export interface VersionPreviewProps {
  docId: string;
  versionId: number;
  name: string;
  onClose: () => void;
}

/** Xem một mốc ở chế độ chỉ đọc: không sửa được, không đụng tới bản hiện hành. */
export const VersionPreview: React.FC<VersionPreviewProps> = ({ docId, versionId, name, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.history;
  const controller = useMemo(() => {
    const created = new CalcController();
    created.readOnly = true;
    return created;
  }, []);
  const [problem, setProblem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useSyncExternalStore(controller.subscribe, controller.getVersion);

  useEffect(() => {
    let cancelled = false;
    getVersionData(docId, versionId)
      .then((data) => {
        if (cancelled) return;
        controller.load(data);
        setReady(true);
      })
      .catch((caught) => !cancelled && setProblem(caught instanceof Error ? caught.message : String(caught)));
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
    };
  }, [docId, versionId, controller, onClose]);

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="calc-dialog version-preview" role="dialog" aria-label={t.previewTitle(name)}>
        <div className="calc-dialog-title">{t.previewTitle(name)}</div>
        {problem && (
          <p className="calc-dialog-problem" role="alert">
            {problem}
          </p>
        )}
        {ready && (
          <>
            <div className="version-preview-grid">
              <CalcGrid controller={controller} zoom={100} gridlines />
            </div>
            <div className="version-preview-tabs" role="tablist">
              {controller.wb.sheets.map((sheet, index) => (
                <button key={sheet.name} type="button" role="tab" aria-selected={index === controller.active} className={`wr-text-btn${index === controller.active ? ' is-primary' : ''}`} onClick={() => controller.switchSheet(index)}>
                  {sheet.name}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="version-preview-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.previewClose}
          </button>
        </div>
      </div>
    </div>
  );
};
