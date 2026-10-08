import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, FileDown, FilePlus, FileText, FolderOpen, Home, Printer } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import type { WriterFormatState } from '../editor/useWriterState';
import type { PageSetup } from '../utils/pageSetup';
import { HomeTab } from './ribbon/HomeTab';
import { InsertTab } from './ribbon/InsertTab';
import { LayoutTab, ViewTab } from './ribbon/LayoutAndViewTabs';

export type RibbonTab = 'home' | 'insert' | 'layout' | 'view';

export interface FileActions {
  onNew: () => void;
  onOpen: () => void;
  onDownloadDocx: () => void;
  onDownloadHtml: () => void;
  onDownloadTxt: () => void;
  onPrint: () => void;
  onHome: () => void;
}

export interface WriterRibbonProps {
  editor: Editor;
  state: WriterFormatState;
  pageSetup: PageSetup;
  onPageSetup: (next: PageSetup) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  contentWidthPx: number;
  file: FileActions;
  onFind: () => void;
  onStats: () => void;
  onError: (message: string) => void;
}

/** The "Tệp" menu, then one tab at a time like Word's ribbon. */
export const WriterRibbon: React.FC<WriterRibbonProps> = ({
  editor,
  state,
  pageSetup,
  onPageSetup,
  zoom,
  onZoom,
  contentWidthPx,
  file,
  onFind,
  onStats,
  onError,
}) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  const [tab, setTab] = useState<RibbonTab>('home');
  const [fileOpen, setFileOpen] = useState(false);
  const fileRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fileOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (fileRoot.current && !fileRoot.current.contains(event.target as Node)) setFileOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setFileOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [fileOpen]);

  const fileItem = (icon: React.ReactNode, label: string, action: () => void, hint?: string) => (
    <button
      type="button"
      className="wr-file-item"
      onClick={() => {
        setFileOpen(false);
        action();
      }}
    >
      {icon}
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </button>
  );

  const tabs: Array<{ id: RibbonTab; label: string }> = [
    { id: 'home', label: t.tabs.home },
    { id: 'insert', label: t.tabs.insert },
    { id: 'layout', label: t.tabs.layout },
    { id: 'view', label: t.tabs.view },
  ];

  return (
    <div className="wr-ribbon">
      <div className="wr-tabs" role="tablist">
        <div className="wr-file-root" ref={fileRoot}>
          <button
            type="button"
            className="wr-tab wr-tab-file"
            aria-haspopup="menu"
            aria-expanded={fileOpen}
            onClick={() => setFileOpen((v) => !v)}
          >
            {t.tabs.file}
            <ChevronDown size={13} />
          </button>
          {fileOpen && (
            <div className="wr-file-menu" role="menu">
              {fileItem(<FilePlus size={16} />, t.file.new, file.onNew)}
              {fileItem(<FolderOpen size={16} />, t.file.open, file.onOpen)}
              <div className="wr-file-sep" />
              {fileItem(<FileDown size={16} />, t.file.downloadDocx, file.onDownloadDocx)}
              {fileItem(<FileText size={16} />, t.file.downloadHtml, file.onDownloadHtml)}
              {fileItem(<FileText size={16} />, t.file.downloadTxt, file.onDownloadTxt)}
              <div className="wr-file-sep" />
              {fileItem(<Printer size={16} />, t.file.print, file.onPrint, t.file.printHint)}
              <div className="wr-file-sep" />
              {fileItem(<Home size={16} />, t.file.close, file.onHome)}
            </div>
          )}
        </div>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`wr-tab${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="wr-tab-panel" role="tabpanel">
        {tab === 'home' && <HomeTab editor={editor} state={state} baseFont={pageSetup.baseFont} baseSize={pageSetup.baseSize} />}
        {tab === 'insert' && <InsertTab editor={editor} state={state} contentWidthPx={contentWidthPx} onError={onError} />}
        {tab === 'layout' && <LayoutTab pageSetup={pageSetup} onChange={onPageSetup} />}
        {tab === 'view' && <ViewTab zoom={zoom} onZoom={onZoom} onFind={onFind} onStats={onStats} />}
      </div>
    </div>
  );
};
