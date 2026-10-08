import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useOfficeI18n } from '../../i18n';
import type { WriterFormatState } from '../editor/useWriterState';
import type { PageSetup } from '../utils/pageSetup';
import { HomeTab } from './ribbon/HomeTab';
import { InsertTab } from './ribbon/InsertTab';
import { LayoutTab, ViewTab } from './ribbon/LayoutAndViewTabs';

export type RibbonTab = 'home' | 'insert' | 'layout' | 'view';

export interface WriterRibbonProps {
  editor: Editor;
  state: WriterFormatState;
  pageSetup: PageSetup;
  onPageSetup: (next: PageSetup) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  contentWidthPx: number;
  onFile: () => void;
  onFind: () => void;
  onStats: () => void;
  onError: (message: string) => void;
}

/** Nút "Tệp" mở màn Tệp toàn khung, rồi từng tab một như ribbon của Word. */
export const WriterRibbon: React.FC<WriterRibbonProps> = ({
  editor,
  state,
  pageSetup,
  onPageSetup,
  zoom,
  onZoom,
  contentWidthPx,
  onFile,
  onFind,
  onStats,
  onError,
}) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  const [tab, setTab] = useState<RibbonTab>('home');
  const tabs: Array<{ id: RibbonTab; label: string }> = [
    { id: 'home', label: t.tabs.home },
    { id: 'insert', label: t.tabs.insert },
    { id: 'layout', label: t.tabs.layout },
    { id: 'view', label: t.tabs.view },
  ];

  return (
    <div className="wr-ribbon">
      <div className="wr-tabs" role="tablist">
        <button type="button" className="wr-tab wr-tab-file" onClick={onFile}>
          {t.tabs.file}
        </button>
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
