import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Archive, ArrowLeft, FilePlus2, FileSpreadsheet, FolderOpen, Home, Info, Printer, Save, SaveAll, X } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { DriveLink } from '../../../shared/archive/officeArchive';
import type { DraftSummary } from '../../../shared/idbStore';
import type { CalcController } from '../../controller';
import { listCalcDrafts } from '../../services/calcDraftStore';
import { workbookStats } from '../../model/workbookStats';
import { PrintPanel } from './PrintPanel';

export type BackstageSection = 'home' | 'new' | 'open' | 'info' | 'save' | 'saveAs' | 'print';

export interface BackstageProps {
  controller: CalcController;
  title: string;
  /** Có bản nháp đã lưu chưa, và lúc lưu gần nhất. */
  savedAt: number | null;
  initial: BackstageSection;
  /** Tệp trong Kho lưu trữ mà bảng tính đang gắn với. */
  archiveLink: DriveLink | null;
  /** Kết quả của lần lưu/mở Kho gần nhất: thành công hoặc lỗi. */
  notice: string | null;
  problem: string | null;
  onSaveToArchive: () => Promise<void>;
  onSaveToArchiveAs: () => void;
  onOpenFromArchive: () => void;
  onClose: () => void;
  onNew: () => void;
  onOpenDevice: () => void;
  onOpenDraft: (id: string) => void;
  onSaveNow: () => Promise<void>;
  onDownloadXlsx: () => void;
  onDownloadCsv: () => void;
  onHome: () => void;
  onMessage: (text: string) => void;
}

const NAV: Array<{ id: BackstageSection; icon: React.ReactNode }> = [
  { id: 'home', icon: <Home size={18} /> },
  { id: 'new', icon: <FilePlus2 size={18} /> },
  { id: 'open', icon: <FolderOpen size={18} /> },
  { id: 'info', icon: <Info size={18} /> },
  { id: 'save', icon: <Save size={18} /> },
  { id: 'saveAs', icon: <SaveAll size={18} /> },
  { id: 'print', icon: <Printer size={18} /> },
];

/** Màn "Tệp" toàn khung như backstage của Excel: danh mục bên trái, nội dung bên phải. */
export const Backstage: React.FC<BackstageProps> = (props) => {
  const { controller, onClose } = props;
  const { m } = useOfficeI18n();
  const t = m.ribbon.backstage;
  const [section, setSection] = useState<BackstageSection>(props.initial);
  useSyncExternalStore(controller.subscribe, controller.getVersion);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="calc-backstage" role="dialog" aria-modal="true" aria-label={m.calc.tabs.file}>
      <nav className="calc-backstage-nav" aria-label={m.calc.tabs.file}>
        <button type="button" className="calc-backstage-back" onClick={onClose} aria-label={t.back} title={t.back}>
          <ArrowLeft size={18} />
        </button>
        {NAV.map(({ id, icon }) => (
          <button key={id} type="button" className={`calc-backstage-item${section === id ? ' is-active' : ''}`} onClick={() => setSection(id)}>
            {icon}
            <span>{t.nav[id]}</span>
          </button>
        ))}
        <button type="button" className="calc-backstage-item is-close" onClick={props.onHome}>
          <X size={18} />
          <span>{m.calc.file.close}</span>
        </button>
      </nav>
      <div className="calc-backstage-panel">
        <h2>{t.nav[section]}</h2>
        {props.problem && (
          <p role="alert" className="calc-backstage-note is-problem">
            {props.problem}
          </p>
        )}
        {props.notice && (
          <p role="status" className="calc-backstage-note">
            {props.notice}
          </p>
        )}
        <BackstageContent section={section} {...props} />
      </div>
    </div>
  );
};

const BackstageContent: React.FC<BackstageProps & { section: BackstageSection }> = (props) => {
  const { section, controller } = props;
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.backstage;
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  useEffect(() => {
    if (section !== 'home' && section !== 'open') return;
    let cancelled = false;
    listCalcDrafts()
      .then((list) => !cancelled && setDrafts(list))
      .catch((caught) => !cancelled && props.onMessage(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const blank = (
    <button type="button" className="calc-template" onClick={props.onNew}>
      <span className="calc-template-thumb">
        <FileSpreadsheet size={34} />
      </span>
      <span>{t.blank}</span>
    </button>
  );

  const recent = (
    <section className="calc-recent" aria-label={t.recent}>
      <h3>{t.recent}</h3>
      {drafts === null ? null : drafts.length === 0 ? (
        <p className="calc-dialog-text">{t.noRecent}</p>
      ) : (
        <ul>
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button type="button" onClick={() => props.onOpenDraft(draft.id)}>
                <FileSpreadsheet size={18} />
                <span className="calc-recent-name">{draft.title || m.calc.untitled}</span>
                <small>{when(draft.updatedAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (section === 'home')
    return (
      <>
        <div className="calc-templates">{blank}</div>
        {recent}
      </>
    );
  if (section === 'new') return <div className="calc-templates">{blank}</div>;
  if (section === 'open')
    return (
      <>
        <button type="button" className="wr-text-btn is-primary" onClick={props.onOpenDevice}>
          <FolderOpen size={16} />
          {t.openFromDevice}
        </button>
        <button type="button" className="wr-text-btn calc-open-archive" onClick={props.onOpenFromArchive}>
          <Archive size={16} />
          {t.openFromArchive}
        </button>
        {recent}
      </>
    );
  if (section === 'info') {
    const stats = workbookStats(controller.wb);
    const rows: Array<[string, string]> = [
      [t.info.name, props.title.trim() || m.calc.untitled],
      [t.info.location, t.info.locationValue],
      [t.info.modified, props.savedAt ? when(props.savedAt) : t.info.notSaved],
      ...(props.archiveLink ? ([[t.archivePath, props.archiveLink.path]] as Array<[string, string]>) : []),
      [t.info.sheets, String(stats.sheets)],
      [t.info.cells, stats.cells.toLocaleString()],
    ];
    return (
      <dl className="calc-info">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }
  if (section === 'save')
    return (
      <div className="calc-save">
        <button
          type="button"
          className="wr-text-btn is-primary"
          onClick={() => {
            void props.onSaveNow().then(() => setSavedNotice(true));
          }}
        >
          <Save size={16} />
          {t.saveNow}
        </button>
        <button type="button" className="wr-text-btn is-primary" onClick={() => void props.onSaveToArchive()}>
          <Archive size={16} />
          {t.saveToArchive}
          {props.archiveLink ? ` (${props.archiveLink.path})` : ''}
        </button>
        {props.archiveLink && (
          <button type="button" className="wr-text-btn" onClick={props.onSaveToArchiveAs}>
            {t.saveToArchiveAs}
          </button>
        )}
        {savedNotice && (
          <p role="status" className="calc-dialog-text">
            {t.saved}
          </p>
        )}
      </div>
    );
  if (section === 'saveAs')
    return (
      <div className="calc-save">
        <button type="button" className="calc-save-option" onClick={props.onDownloadXlsx}>
          <FileSpreadsheet size={20} />
          <span>{t.saveAsXlsx}</span>
        </button>
        <button type="button" className="calc-save-option" onClick={props.onDownloadCsv}>
          <FileSpreadsheet size={20} />
          <span>{t.saveAsCsv}</span>
        </button>
      </div>
    );
  return <PrintPanel controller={controller} onMessage={props.onMessage} />;
};
