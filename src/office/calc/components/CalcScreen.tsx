import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Archive as ArchiveIcon, Download, History, Share2 } from 'lucide-react';
import { canEdit, canManageSharing, createSharedDocument, type SharedRole } from '../../collab/collabApi';
import { loadSharedWorkbook } from '../../collab/loadShared';
import { ActivityPanel } from '../../collab/ActivityPanel';
import { HistoryPanel } from '../../collab/HistoryPanel';
import { PresenceBar } from '../../collab/PresenceBar';
import { usePresence } from '../../collab/usePresence';
import { ShareDialog } from '../../collab/ShareDialog';
import { useCollabSession } from '../../collab/useCollabSession';
import { useArchiveDocument } from '../../shared/archive/useArchiveDocument';
import type { DriveLink } from '../../shared/archive/officeArchive';
import { saveDocument } from '../../shared/files';
import { OfficeHeader } from '../../shared/OfficeHeader';
import { useOfficeI18n } from '../../i18n';
import { CalcController } from '../controller';
import { formatGeneral, isError } from '../engine/values';
import type { WorkbookData } from '../model/workbook';
import { getCalcDraft, newDraftId, saveCalcDraft } from '../services/calcDraftStore';
import { exportCsv, exportXlsx, importSpreadsheet } from '../services/xlsxService';
import { CalcFindPanel } from './CalcFindPanel';
import { CalcGrid } from './CalcGrid';
import { Backstage, type BackstageSection } from './backstage/Backstage';
import { CalcRibbon } from './CalcRibbon';
import { FormulaBar } from './FormulaBar';
import { SheetTabs } from './SheetTabs';
import { clampZoom, DEFAULT_VIEW, type ViewOptions } from './viewOptions';

const SAVE_DELAY_MS = 800;

interface Loaded {
  id: string | null;
  title: string;
  data: WorkbookData | null;
  needsSave: boolean;
  savedAt: number | null;
  link: DriveLink | null;
  /** Mở từ bảng tính chung trên hệ thống: mã, quyền của người mở và số thứ tự đã tải. */
  shared: { id: string; role: SharedRole; seq: number } | null;
}

export interface CalcScreenProps {
  docId: string | null;
  /** Mã bảng tính chung cần mở (thay cho nháp). */
  sharedId?: string | null;
  file: File | null;
  /** Tệp trong Kho lưu trữ mà `file` được mở ra từ đó. */
  link?: DriveLink | null;
  onHome: () => void;
  onOpenFile: (file: File, link?: DriveLink) => void;
  onNew: () => void;
  onOpenDraft: (id: string) => void;
  /** Mở bảng tính chung vừa đưa lên hệ thống. */
  onOpenShared?: (id: string) => void;
  /** Dựng lại màn để tải bản mới nhất của bảng tính chung. */
  onReloadShared?: () => void;
  /** Tên người sửa, ghi vào ghi chú. */
  author: string;
  /** Mã tài khoản đang mở, để nhật ký ghi "Bạn" cho thay đổi của chính mình. */
  userId?: string;
  onDraftId: (id: string, isNew: boolean) => void;
}

export const CalcScreen: React.FC<CalcScreenProps> = (props) => {
  const { m } = useOfficeI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (props.sharedId) {
          const opened = await loadSharedWorkbook(props.sharedId);
          if (!cancelled) setLoaded({ id: null, title: opened.doc.title, data: opened.data, needsSave: false, savedAt: null, link: null, shared: { id: opened.doc.id, role: opened.doc.role, seq: opened.seq } });
        } else if (props.docId) {
          const draft = await getCalcDraft(props.docId);
          if (!draft) throw new Error(m.writer.errors.draftMissing);
          props.onDraftId(draft.id, false);
          if (!cancelled) setLoaded({ id: draft.id, title: draft.title, data: draft.data, needsSave: false, savedAt: draft.updatedAt, link: draft.driveLink ?? null, shared: null });
        } else if (props.file) {
          const imported = await importSpreadsheet(props.file, m.calc.errors.unsupported);
          if (!cancelled) setLoaded({ id: null, title: imported.title, data: imported.data, needsSave: true, savedAt: null, link: props.link ?? null, shared: null });
        } else if (!cancelled) {
          setLoaded({ id: null, title: '', data: null, needsSave: false, savedAt: null, link: null, shared: null });
        }
      } catch (caught) {
        const detail = caught instanceof Error ? caught.message : String(caught);
        if (!cancelled) setError(props.file ? m.calc.errors.openFailed(detail) : detail);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once per mount: OfficeApp remounts this screen to open another document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error || !loaded) {
    return (
      <div className="office-page">
        <OfficeHeader onHome={props.onHome} />
        <div className="office-notice" role={error ? 'alert' : 'status'}>
          <p>{error ?? (props.file ? m.calc.opening : m.app.loading)}</p>
          {error && (
            <button type="button" className="wr-text-btn is-primary" onClick={props.onHome}>
              {m.app.home}
            </button>
          )}
        </div>
      </div>
    );
  }
  return <CalcBody {...props} loaded={loaded} />;
};

const CalcBody: React.FC<CalcScreenProps & { loaded: Loaded }> = ({ loaded, onHome, onOpenFile, onNew, onOpenDraft, onOpenShared, onReloadShared, author, userId = '', onDraftId }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const controller = useMemo(() => {
    const c = new CalcController();
    if (loaded.data) c.load(loaded.data);
    c.readOnly = loaded.shared !== null && !canEdit(loaded.shared.role);
    return c;
  }, [loaded]);
  useSyncExternalStore(controller.subscribe, controller.getVersion);

  const [title, setTitle] = useState(loaded.title);
  const [zoom, setZoom] = useState(100);
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW);
  const [backstage, setBackstage] = useState<BackstageSection | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(loaded.savedAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [shareOpen, setShareOpen] = useState(false);
  const me = useMemo(() => ({ id: userId, name: author }), [userId, author]);
  const [panel, setPanel] = useState<'activity' | 'history' | null>(null);
  const [sharing, setSharing] = useState(false);
  const openInput = useRef<HTMLInputElement>(null);

  const idRef = useRef<string | null>(loaded.id);
  const linkRef = useRef<DriveLink | null>(loaded.link);
  const titleRef = useRef(title);
  titleRef.current = title;
  const timer = useRef<number | undefined>(undefined);
  /** Tên bảng tính chung mà máy chủ đang giữ, để chỉ gửi khi người dùng đổi thật. */
  const lastTitle = useRef(loaded.title.trim());
  const dirty = useRef(loaded.needsSave);
  const lastWbVersion = useRef(controller.wb.version);

  const documentName = () => titleRef.current.trim() || t.untitled;

  const shared = loaded.shared;
  const { flush: flushCollab, saveMilestone, restore, rename, ...collab } = useCollabSession({
    id: shared?.id ?? null,
    controller,
    initialData: loaded.data,
    initialSeq: shared?.seq ?? 0,
    canWrite: !!shared && canEdit(shared.role),
    onReset: () => onReloadShared?.(),
    onTitle: (next) => {
      titleRef.current = next;
      lastTitle.current = next.trim();
      setTitle(next);
    },
  });

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (shared) {
      await flushCollab();
      return;
    }
    if (!dirty.current) return;
    dirty.current = false;
    const isNew = idRef.current === null;
    const id = idRef.current ?? newDraftId();
    idRef.current = id;
    setSaveState('saving');
    try {
      const updatedAt = Date.now();
      await saveCalcDraft({ id, title: titleRef.current.trim(), data: controller.wb.toData(), updatedAt, ...(linkRef.current ? { driveLink: linkRef.current } : {}) });
      if (isNew) onDraftId(id, true);
      setSavedAt(updatedAt);
      setSaveState('saved');
    } catch {
      dirty.current = true;
      setSaveState('failed');
    }
  }, [controller, onDraftId, shared, flushCollab]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  // Autosave when the workbook (not just the selection) changes.
  useEffect(() => {
    if (loaded.needsSave) scheduleSave();
    return controller.subscribe(() => {
      if (controller.wb.version !== lastWbVersion.current) {
        lastWbVersion.current = controller.wb.version;
        scheduleSave();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [flush]);

  useEffect(() => {
    controller.onReject = (custom) => setMessage(custom ?? t.validation.rejected);
    controller.onProtected = () => setMessage(controller.readOnly ? m.ribbon.share.readOnly : m.ribbon.review.protectedNotice);
    return () => {
      controller.onReject = null;
      controller.onProtected = null;
    };
  }, [controller, t.validation.rejected, m.ribbon.review.protectedNotice, m.ribbon.share.readOnly]);

  const protectedNotice = m.ribbon.review.protectedNotice;
  const sheetProtected = controller.sheetProtected;
  useEffect(() => {
    if (!sheetProtected) setMessage((current) => (current === protectedNotice ? null : current));
  }, [sheetProtected, protectedNotice]);

  const fail = (caught: unknown) => setMessage(t.errors.exportFailed(caught instanceof Error ? caught.message : String(caught)));

  const downloadXlsx = async () => {
    try {
      controller.commitEdit(null);
      saveDocument(await exportXlsx(controller.wb), `${documentName()}.xlsx`);
    } catch (caught) {
      fail(caught);
    }
  };

  const downloadCsv = async () => {
    try {
      controller.commitEdit(null);
      saveDocument(exportCsv(controller.wb, controller.active), `${documentName()}.csv`);
    } catch (caught) {
      fail(caught);
    }
  };

  const archive = useArchiveDocument({
    initialLink: loaded.link,
    extension: '.xlsx',
    openExtensions: ['.xlsx', '.xlsm', '.csv', '.tsv'],
    fallbackName: t.untitled,
    title: () => titleRef.current,
    buildBlob: async () => {
      controller.commitEdit(null);
      return exportXlsx(controller.wb);
    },
    onLinkChange: (next) => {
      linkRef.current = next;
      dirty.current = true;
      void flush();
    },
    onOpened: (file, link) => {
      void flush().then(() => onOpenFile(file, link));
    },
    onNotice: setNotice,
    onProblem: setMessage,
  });

  // Ctrl+S: bảng tính đã gắn tệp trong Kho lưu trữ thì ghi đè tệp đó, chưa gắn thì mở mục Lưu của màn Tệp.
  const saveShortcut = useRef<() => void>(() => {});
  saveShortcut.current = () => (archive.link ? void archive.saveToArchive() : setBackstage('save'));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'h' || (key === 'f' && !event.shiftKey)) {
        event.preventDefault();
        setFindOpen(true);
      } else if (key === 'p' && !event.shiftKey) {
        event.preventDefault();
        setBackstage('print');
      } else if (key === 's') {
        event.preventDefault();
        saveShortcut.current();
      } else if (key === '=' || key === '+') {
        event.preventDefault();
        setZoom((z) => clampZoom(z + 10));
      } else if (key === '-') {
        event.preventDefault();
        setZoom((z) => clampZoom(z - 10));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // Sum, average and count of the selected numbers, as Excel's status bar shows them.
  const stats = (() => {
    const { r1, c1, r2, c2 } = controller.selection;
    if ((r2 - r1 + 1) * (c2 - c1 + 1) < 2 || (r2 - r1 + 1) * (c2 - c1 + 1) > 200_000) return null;
    let sum = 0;
    let count = 0;
    for (let r = r1; r <= r2; r += 1)
      for (let c = c1; c <= c2; c += 1) {
        const v = controller.wb.valueAt(controller.active, r, c);
        if (typeof v === 'number' && !isError(v)) {
          sum += v;
          count += 1;
        }
      }
    return count > 0 ? { sum, count, average: sum / count } : null;
  })();

  const share = async () => {
    if (shared) {
      if (canManageSharing(shared.role)) setShareOpen(true);
      return;
    }
    if (!window.confirm(m.ribbon.share.uploadConfirm)) return;
    setSharing(true);
    try {
      controller.commitEdit(null);
      onOpenShared?.(await createSharedDocument(titleRef.current.trim(), controller.wb.toData()));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSharing(false);
    }
  };

  const shareText = m.ribbon.share;
  const people = usePresence(shared?.id ?? null, me, controller);
  useEffect(() => {
    if (collab.error) setMessage(collab.error);
  }, [collab.error]);
  const sharedSaveLabel = shared
    ? controller.readOnly
      ? shareText.roleLabel[shared.role]
      : collab.status === 'saving'
        ? shareText.saving
        : collab.status === 'failed'
          ? shareText.saveFailed
          : shareText.saved
    : null;
  const saveLabel =
    sharedSaveLabel ?? (saveState === 'saving' ? m.writer.saving : saveState === 'saved' ? m.writer.saved : saveState === 'failed' ? m.writer.saveFailed : '');

  return (
    <div className="office-page writer-page calc-page">
      <OfficeHeader
        onHome={() => {
          void flush().then(onHome);
        }}
        actions={
          <>
            {shared && (
              <>
                <button type="button" className="office-header-link" onClick={() => setPanel((current) => (current === 'activity' ? null : 'activity'))} aria-pressed={panel === 'activity'}>
                  <History size={14} />
                  <span>{m.ribbon.activity.open}</span>
                </button>
                <button type="button" className="office-header-link" onClick={() => setPanel((current) => (current === 'history' ? null : 'history'))} aria-pressed={panel === 'history'}>
                  <ArchiveIcon size={14} />
                  <span>{m.ribbon.history.open}</span>
                </button>
              </>
            )}
            {(!shared || canManageSharing(shared.role)) && (
              <button type="button" className="office-header-link" onClick={() => void share()} disabled={sharing}>
                <Share2 size={14} />
                <span>{shareText.button}</span>
              </button>
            )}
            <button type="button" className="office-header-btn" onClick={() => void downloadXlsx()} title={t.file.downloadXlsx}>
              <Download size={15} />
              <span>XLSX</span>
            </button>
          </>
        }
      >
        <input
          className="writer-title-input"
          type="text"
          value={title}
          placeholder={t.untitled}
          aria-label={t.titleLabel}
          readOnly={controller.readOnly || (!!shared && !canEdit(shared.role))}
          onBlur={() => {
            if (shared && canEdit(shared.role) && titleRef.current.trim() !== lastTitle.current) {
              lastTitle.current = titleRef.current.trim();
              void rename(titleRef.current.trim()).catch((caught) => setMessage(caught instanceof Error ? caught.message : String(caught)));
            }
          }}
          onChange={(event) => {
            setTitle(event.target.value);
            titleRef.current = event.target.value;
            scheduleSave();
          }}
        />
        <span className={`writer-save-state${saveState === 'failed' || collab.status === 'failed' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {saveLabel}
        </span>
        <PresenceBar people={people} unnamed={m.ribbon.presence.unnamed} label={m.ribbon.presence.label} />
      </OfficeHeader>

      <CalcRibbon
        controller={controller}
        zoom={zoom}
        onZoom={(next) => setZoom(clampZoom(next))}
        view={view}
        onView={setView}
        author={author}
        onFile={() => setBackstage('home')}
        onFind={() => setFindOpen(true)}
        onMessage={setMessage}
        gridSize={() => {
          const el = document.querySelector<HTMLElement>('.calc-grid');
          return el ? { width: el.clientWidth - (view.headings ? 52 : 0), height: el.clientHeight - (view.headings ? 24 : 0) } : null;
        }}
        onNewWindow={() => {
          void flush().then(() => window.open(window.location.href, '_blank', 'noopener'));
        }}
      />
      <input
        ref={openInput}
        type="file"
        hidden
        accept=".xlsx,.xlsm,.csv,.tsv,.txt"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void flush().then(() => onOpenFile(file));
        }}
      />

      {message && (
        <div className="office-banner" role="alert">
          <span>{message}</span>
          <button type="button" className="wr-text-btn" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}
      {panel === 'activity' && shared && <ActivityPanel docId={shared.id} seq={collab.seq} me={me} onClose={() => setPanel(null)} />}
      {panel === 'history' && shared && (
        <HistoryPanel
          docId={shared.id}
          canWrite={canEdit(shared.role)}
          me={me}
          onSave={saveMilestone}
          onRestore={(versionId) => restore(versionId, m.ribbon.history.safetyLabel)}
          onClose={() => setPanel(null)}
        />
      )}
      {shareOpen && shared && <ShareDialog docId={shared.id} onClose={() => setShareOpen(false)} />}
      {findOpen && <CalcFindPanel controller={controller} onClose={() => setFindOpen(false)} />}

      {view.formulaBar && <FormulaBar controller={controller} />}
      <CalcGrid controller={controller} zoom={zoom} gridlines={view.gridlines} headings={view.headings} showFormulas={view.showFormulas} />
      <SheetTabs controller={controller} onMessage={setMessage} />
      {backstage && (
        <Backstage
          controller={controller}
          title={title}
          savedAt={savedAt}
          initial={backstage}
          archiveLink={archive.link}
          locationLabel={shared ? shareText.sharedLocation : undefined}
          notice={notice}
          problem={message}
          onSaveToArchive={archive.saveToArchive}
          onSaveToArchiveAs={archive.saveToArchiveAs}
          onOpenFromArchive={archive.openFromArchive}
          onClose={() => {
            setBackstage(null);
            setNotice(null);
          }}
          onNew={() => {
            void flush().then(onNew);
          }}
          onOpenDevice={() => openInput.current?.click()}
          onOpenDraft={(id) => {
            void flush().then(() => onOpenDraft(id));
          }}
          onSaveNow={async () => {
            dirty.current = true;
            await flush();
          }}
          onDownloadXlsx={() => void downloadXlsx()}
          onDownloadCsv={() => void downloadCsv()}
          onHome={() => {
            void flush().then(onHome);
          }}
          onMessage={setMessage}
        />
      )}
      {archive.dialog}

      <footer className="writer-status" aria-label="status">
        <span>
          {stats ? '' : controller.filter && controller.wb.hiddenRows(controller.active).size > 0 ? t.status.records(controller.filter.range.r2 - controller.filter.range.r1 - controller.wb.hiddenRows(controller.active).size, controller.filter.range.r2 - controller.filter.range.r1) : t.status.ready}
        </span>
        {stats && (
          <>
            <span>{t.status.average(formatGeneral(Number(stats.average.toPrecision(10))))}</span>
            <span>{t.status.count(String(stats.count))}</span>
            <span>{t.status.sum(formatGeneral(Number(stats.sum.toPrecision(12))))}</span>
          </>
        )}
        <span className="calc-status-zoom">{zoom}%</span>
      </footer>
    </div>
  );
};
