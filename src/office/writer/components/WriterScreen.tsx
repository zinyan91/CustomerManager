import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Download, Printer } from 'lucide-react';
import { useArchiveDocument } from '../../shared/archive/useArchiveDocument';
import type { DriveLink } from '../../shared/archive/officeArchive';
import { downloadBlob, saveDocument } from '../../shared/files';
import { OfficeHeader } from '../../shared/OfficeHeader';
import { useOfficeI18n } from '../../i18n';
import { WriterEditor } from '../editor/WriterEditor';
import { promptLink } from '../editor/linkPrompt';
import { useWriterState } from '../editor/useWriterState';
import { exportDocx } from '../services/docxExportService';
import { importDocument } from '../services/docxImportService';
import { getDraft, newDraftId, saveDraft } from '../services/draftStore';
import { buildPrintHtml, printDocument } from '../services/printService';
import { docStats, docToPlainText, firstLine, type DocNode, type DocStats } from '../utils/docJson';
import { DEFAULT_PAGE_SETUP, pageGeometryPx, parsePageSetup, type PageSetup } from '../utils/pageSetup';
import { pageAt, type PaginationResult } from '../utils/pagination';
import { FindReplacePanel } from './FindReplacePanel';
import { StatsDialog } from './StatsDialog';
import { WriterRibbon } from './WriterRibbon';
import { ZOOM_MAX, ZOOM_MIN } from './ribbon/LayoutAndViewTabs';

const SAVE_DELAY_MS = 800;

interface Loaded {
  id: string | null;
  title: string;
  content: DocNode | string;
  pageSetup: PageSetup;
  /** True when the content did not come from a saved draft: save it as soon as it is open. */
  needsSave: boolean;
  link: DriveLink | null;
}

export interface WriterScreenProps {
  /** A saved draft to open, or null for a new document. */
  docId: string | null;
  /** A file to open into a new draft (from the home screen or File ▸ Open). */
  file: File | null;
  /** Tệp trong Kho lưu trữ mà `file` được mở ra từ đó. */
  link?: DriveLink | null;
  onHome: () => void;
  onOpenFile: (file: File, link?: DriveLink) => void;
  onNew: () => void;
  /** The draft now has this id; `isNew` when it was just created (the address should show it). */
  onDraftId: (id: string, isNew: boolean) => void;
}

/** Opens what the route asks for, then hands it to the editor. */
export const WriterScreen: React.FC<WriterScreenProps> = (props) => {
  const { m } = useOfficeI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (props.docId) {
          const draft = await getDraft(props.docId);
          if (!draft) throw new Error(m.writer.errors.draftMissing);
          props.onDraftId(draft.id, false);
          if (!cancelled) {
            setLoaded({ id: draft.id, title: draft.title, content: draft.doc, pageSetup: draft.pageSetup, needsSave: false, link: draft.driveLink ?? null });
          }
        } else if (props.file) {
          const imported = await importDocument(props.file);
          if (!cancelled) {
            setLoaded({ id: null, title: imported.title, content: imported.html, pageSetup: parsePageSetup({ ...DEFAULT_PAGE_SETUP, ...imported.pageDefaults }), needsSave: true, link: props.link ?? null });
          }
        } else if (!cancelled) {
          setLoaded({ id: null, title: '', content: '', pageSetup: DEFAULT_PAGE_SETUP, needsSave: false, link: null });
        }
      } catch (caught) {
        const detail = caught instanceof Error ? caught.message : String(caught);
        if (!cancelled) setError(props.file ? m.writer.errors.openFailed(detail) : detail);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per mount: OfficeApp remounts this screen to open another document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="office-page">
        <OfficeHeader onHome={props.onHome} />
        <div className="office-notice" role="alert">
          <p>{error}</p>
          <button type="button" className="wr-text-btn is-primary" onClick={props.onHome}>
            {m.app.home}
          </button>
        </div>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="office-page">
        <OfficeHeader onHome={props.onHome} />
        <div className="office-notice" role="status">
          {props.file ? m.writer.opening : m.app.loading}
        </div>
      </div>
    );
  }
  return <WriterBody {...props} loaded={loaded} />;
};

const WriterBody: React.FC<WriterScreenProps & { loaded: Loaded }> = ({ loaded, onHome, onOpenFile, onNew, onDraftId }) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  const [editor, setEditor] = useState<Editor | null>(null);
  const state = useWriterState(editor);
  const [title, setTitle] = useState(loaded.title);
  const [pageSetup, setPageSetup] = useState(loaded.pageSetup);
  const [zoom, setZoom] = useState(100);
  const [findOpen, setFindOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationResult>({ breaks: [], pageCount: 1, pageOfBlock: [], unitPositions: [] });
  const [stats, setStats] = useState<DocStats>({ words: 0, chars: 0, charsNoSpaces: 0, paragraphs: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const openInput = useRef<HTMLInputElement>(null);

  const idRef = useRef<string | null>(loaded.id);
  const linkRef = useRef<DriveLink | null>(loaded.link);
  const latest = useRef({ title, pageSetup, doc: null as DocNode | null });
  latest.current.title = title;
  latest.current.pageSetup = pageSetup;
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);

  const geometry = useMemo(() => pageGeometryPx(pageSetup), [pageSetup]);

  const documentName = useCallback((): string => {
    const doc = latest.current.doc;
    return latest.current.title.trim() || (doc ? firstLine(doc) : '') || t.untitled;
  }, [t.untitled]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const doc = latest.current.doc;
    if (!dirty.current || !doc) return;
    dirty.current = false;
    const isNew = idRef.current === null;
    const id = idRef.current ?? newDraftId();
    idRef.current = id;
    setSaveState('saving');
    try {
      await saveDraft({
        id,
        title: latest.current.title.trim() || firstLine(doc),
        doc,
        pageSetup: latest.current.pageSetup,
        updatedAt: Date.now(),
        ...(linkRef.current ? { driveLink: linkRef.current } : {}),
      });
      if (isNew) onDraftId(id, true);
      setSaveState('saved');
    } catch {
      dirty.current = true;
      setSaveState('failed');
    }
  }, [onDraftId]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  // Save what is pending when the tab is hidden or closed, and when leaving this screen.
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

  const onReady = useCallback(
    (instance: Editor) => {
      setEditor(instance);
      latest.current.doc = instance.getJSON() as DocNode;
      setStats(docStats(latest.current.doc));
      if (loaded.needsSave) scheduleSave();
    },
    [loaded.needsSave, scheduleSave],
  );

  const statsTimer = useRef<number | undefined>(undefined);
  const onChange = useCallback(
    (instance: Editor) => {
      latest.current.doc = instance.getJSON() as DocNode;
      scheduleSave();
      window.clearTimeout(statsTimer.current);
      statsTimer.current = window.setTimeout(() => latest.current.doc && setStats(docStats(latest.current.doc)), 250);
    },
    [scheduleSave],
  );

  useEffect(() => () => window.clearTimeout(statsTimer.current), []);

  // The page the cursor is on.
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setCurrentPage(pageAt(pagination, editor.state.selection.from));
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor, pagination]);

  const changePageSetup = useCallback(
    (next: PageSetup) => {
      setPageSetup(next);
      latest.current.pageSetup = next;
      scheduleSave();
    },
    [scheduleSave],
  );

  const exportOptions = () => ({
    title: documentName(),
    pageSetup: latest.current.pageSetup,
    pageTemplate: t.layout.pageTemplate,
    tocTitle: t.toc.title,
  });

  const fail = (caught: unknown) => setError(t.errors.exportFailed(caught instanceof Error ? caught.message : String(caught)));

  const downloadDocx = async () => {
    if (!editor) return;
    try {
      const blob = await exportDocx(editor.getJSON() as DocNode, exportOptions());
      saveDocument(blob, `${documentName()}.docx`);
    } catch (caught) {
      fail(caught);
    }
  };

  const buildDocx = async (): Promise<Blob> => {
    if (!editor) throw new Error(t.errors.unsupported);
    return exportDocx(editor.getJSON() as DocNode, exportOptions());
  };

  const archive = useArchiveDocument({
    initialLink: loaded.link,
    extension: '.docx',
    openExtensions: ['.docx', '.txt', '.md', '.html', '.htm'],
    fallbackName: t.untitled,
    title: documentName,
    buildBlob: buildDocx,
    onLinkChange: (next) => {
      linkRef.current = next;
      dirty.current = true;
      void flush();
    },
    onOpened: (file, link) => {
      void flush().then(() => onOpenFile(file, link));
    },
    onNotice: setNotice,
    onProblem: setError,
  });

  const downloadHtml = async () => {
    if (!editor) return;
    const html = buildPrintHtml(editor.getHTML(), editor.getJSON() as DocNode, exportOptions());
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${documentName()}.html`);
  };

  const downloadTxt = async () => {
    if (!editor) return;
    downloadBlob(new Blob([docToPlainText(editor.getJSON() as DocNode)], { type: 'text/plain;charset=utf-8' }), `${documentName()}.txt`);
  };

  const print = () => {
    if (!editor) return;
    printDocument(editor.getHTML(), editor.getJSON() as DocNode, exportOptions());
  };

  // Word's shortcuts that the editor does not bind itself.
  useEffect(() => {
    if (!editor) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'h' || (key === 'f' && !event.shiftKey)) {
        event.preventDefault();
        setFindOpen(true);
      } else if (key === 'k') {
        event.preventDefault();
        promptLink(editor, t.cmd.linkPrompt);
      } else if (key === 's') {
        event.preventDefault();
        void flush();
        void downloadDocx();
      } else if (key === 'p') {
        event.preventDefault();
        print();
      } else if (key === '=' || key === '+') {
        event.preventDefault();
        setZoom((z) => Math.min(ZOOM_MAX, z + 10));
      } else if (key === '-') {
        event.preventDefault();
        setZoom((z) => Math.max(ZOOM_MIN, z - 10));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // The handlers read the latest editor state through the ref and the editor itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, t]);

  const saveLabel =
    saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : saveState === 'failed' ? t.saveFailed : '';

  return (
    <div className="office-page writer-page">
      <OfficeHeader
        onHome={() => {
          void flush().then(onHome);
        }}
        actions={
          <>
            <button type="button" className="office-header-btn" onClick={() => void downloadDocx()} title={t.file.downloadDocx} disabled={!editor}>
              <Download size={15} />
              <span>DOCX</span>
            </button>
            <button type="button" className="office-icon-btn" onClick={print} title={t.file.print} aria-label={t.file.print} disabled={!editor}>
              <Printer size={16} />
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
          onChange={(event) => {
            setTitle(event.target.value);
            latest.current.title = event.target.value;
            scheduleSave();
          }}
        />
        <span className={`writer-save-state${saveState === 'failed' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {saveLabel}
        </span>
      </OfficeHeader>

      {editor && (
        <WriterRibbon
          editor={editor}
          state={state}
          pageSetup={pageSetup}
          onPageSetup={changePageSetup}
          zoom={zoom}
          onZoom={setZoom}
          contentWidthPx={geometry.contentWidth}
          onFind={() => setFindOpen(true)}
          onStats={() => setStatsOpen(true)}
          onError={setError}
          file={{
            onNew,
            onOpen: () => openInput.current?.click(),
            onDownloadDocx: () => void downloadDocx(),
            onDownloadHtml: () => void downloadHtml(),
            onDownloadTxt: () => void downloadTxt(),
            onPrint: print,
            onOpenArchive: archive.openFromArchive,
            onSaveArchive: () => void archive.saveToArchive(),
            onSaveArchiveAs: archive.saveToArchiveAs,
            archiveLinked: archive.link !== null,
            onHome: () => {
              void flush().then(onHome);
            },
          }}
        />
      )}
      <input
        ref={openInput}
        type="file"
        hidden
        accept=".docx,.txt,.md,.html,.htm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void flush().then(() => onOpenFile(file));
        }}
      />

      {error && (
        <div className="office-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="wr-text-btn" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="office-banner is-ok" role="status">
          <span>{notice}</span>
          <button type="button" className="wr-text-btn" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      {archive.dialog}
      {editor && findOpen && <FindReplacePanel editor={editor} state={state} onClose={() => setFindOpen(false)} />}

      <div className="writer-scroll">
        <WriterEditor
          initialContent={loaded.content}
          pageSetup={pageSetup}
          zoom={zoom}
          pageCount={pagination.pageCount}
          onReady={onReady}
          onChange={onChange}
          onPaginate={setPagination}
        />
      </div>

      <footer className="writer-status" aria-label="status">
        <span>{t.status.page(Math.min(currentPage, pagination.pageCount), pagination.pageCount)}</span>
        <span>{t.status.words(stats.words)}</span>
        <span>{t.status.chars(stats.chars)}</span>
      </footer>

      {statsOpen && <StatsDialog stats={stats} pages={pagination.pageCount} onClose={() => setStatsOpen(false)} />}
    </div>
  );
};
