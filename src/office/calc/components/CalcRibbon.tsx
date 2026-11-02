import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CalcController } from '../controller';
import type { ViewOptions } from './viewOptions';
import { useOfficeI18n } from '../../i18n';
import { OPEN_FORMAT_EVENT, OPEN_NAMES_EVENT } from '../shortcuts';
import { FormatCellsDialog } from './formatCells/FormatCellsDialog';
import type { FormatCellsTabId } from './formatCells/types';
import { NamesDialog } from './NamesDialog';
import { SortDialog } from './SortDialog';
import { SummaryDialog } from './SummaryDialog';
import { ValidationDialog } from './ValidationDialog';
import type { RibbonTabCommonProps } from './ribbon/types';
import { HomeTab } from './ribbon/HomeTab';
import { InsertTab } from './ribbon/InsertTab';
import { PageLayoutTab } from './ribbon/PageLayoutTab';
import { FormulasTab } from './ribbon/FormulasTab';
import { DataTab } from './ribbon/DataTab';
import { ReviewTab } from './ribbon/ReviewTab';
import { ViewTab } from './ribbon/ViewTab';
import { TableDesignTab } from './ribbon/TableDesignTab';

export type CalcTab = 'home' | 'insert' | 'layout' | 'formulas' | 'data' | 'review' | 'view' | 'tableDesign';

export interface CalcRibbonProps {
  controller: CalcController;
  zoom: number;
  onZoom: (zoom: number) => void;
  view: ViewOptions;
  onView: (view: ViewOptions) => void;
  /** Tên người sửa, ghi vào ghi chú. */
  author: string;
  onFile: () => void;
  onFind: () => void;
  onMessage: (text: string) => void;
  gridSize: () => { width: number; height: number } | null;
  onNewWindow: () => void;
}

export const CalcRibbon: React.FC<CalcRibbonProps> = ({ controller, zoom, onZoom, view, onView, author, onFile, onFind, onMessage, gridSize, onNewWindow }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  useSyncExternalStore(controller.subscribe, controller.getVersion);

  const [tab, setTab] = useState<CalcTab>('home');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatTab, setFormatTab] = useState<FormatCellsTabId>('number');

  const openFormatWithTab = (tabId: FormatCellsTabId) => {
    setFormatTab(tabId);
    setFormatOpen(true);
  };

  useEffect(() => {
    const openNames = () => setNamesOpen(true);
    const openFormat = (event: Event) => {
      const custom = event as CustomEvent<FormatCellsTabId>;
      if (custom.detail && typeof custom.detail === 'string') {
        setFormatTab(custom.detail);
      }
      setFormatOpen(true);
    };
    window.addEventListener(OPEN_NAMES_EVENT, openNames);
    window.addEventListener(OPEN_FORMAT_EVENT, openFormat);
    return () => {
      window.removeEventListener(OPEN_NAMES_EVENT, openNames);
      window.removeEventListener(OPEN_FORMAT_EVENT, openFormat);
    };
  }, []);

  const sheetFocus = () => {
    document.querySelector<HTMLDivElement>('.calc-grid')?.focus({ preventScroll: true });
  };

  const act = (fn: () => void) => () => {
    fn();
    sheetFocus();
  };

  const commonProps: RibbonTabCommonProps = {
    controller,
    sheetFocus,
    act,
    onMessage,
    openFormatWithTab,
  };

  const isTableActive = controller.isTableActive();
  const prevTableActive = useRef(isTableActive);

  useEffect(() => {
    if (!prevTableActive.current && isTableActive) {
      setTab('tableDesign');
    } else if (prevTableActive.current && !isTableActive && tab === 'tableDesign') {
      setTab('home');
    }
    prevTableActive.current = isTableActive;
  }, [isTableActive, tab]);

  const tabs: Array<{ id: CalcTab; label: string; contextual?: boolean }> = [
    { id: 'home', label: t.tabs.home },
    { id: 'insert', label: t.tabs.insert },
    { id: 'layout', label: t.tabs.layout },
    { id: 'formulas', label: t.tabs.formulas },
    { id: 'data', label: t.tabs.data },
    { id: 'review', label: t.tabs.review },
    { id: 'view', label: t.tabs.view },
    ...(isTableActive ? [{ id: 'tableDesign' as CalcTab, label: t.tabs.tableDesign, contextual: true }] : []),
  ];

  return (
    <div className="wr-ribbon calc-ribbon">
      <div className="wr-tabs" role="tablist">
        <button
          type="button"
          className="wr-tab wr-tab-file"
          onClick={onFile}
        >
          {t.tabs.file}
        </button>
        {tabs.map(({ id, label, contextual }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`wr-tab${tab === id ? ' is-active' : ''}${contextual ? ' wr-tab-contextual' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {validationOpen && <ValidationDialog controller={controller} onClose={() => setValidationOpen(false)} />}
      {namesOpen && <NamesDialog controller={controller} onClose={() => setNamesOpen(false)} />}
      {formatOpen && <FormatCellsDialog controller={controller} initialTab={formatTab} onClose={() => setFormatOpen(false)} />}
      {sortOpen && <SortDialog controller={controller} onClose={() => setSortOpen(false)} />}
      {summaryOpen && <SummaryDialog controller={controller} onClose={() => setSummaryOpen(false)} onMessage={onMessage} />}

      <div
        className="wr-tab-panel"
        role="tabpanel"
        ref={(el) => {
          if (el) {
            el.onwheel = (e) => {
              if (el.scrollWidth > el.clientWidth) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  el.scrollLeft += e.deltaY;
                  e.preventDefault();
                }
              }
            };
          }
        }}
      >
        {tab === 'home' && <HomeTab {...commonProps} onFind={onFind} setSortOpen={setSortOpen} />}
        {tab === 'insert' && <InsertTab {...commonProps} setSummaryOpen={setSummaryOpen} />}
        {tab === 'layout' && <PageLayoutTab controller={controller} view={view} onView={onView} />}
        {tab === 'formulas' && <FormulasTab {...commonProps} setNamesOpen={setNamesOpen} view={view} onView={onView} />}
        {tab === 'data' && <DataTab {...commonProps} setSortOpen={setSortOpen} setValidationOpen={setValidationOpen} />}
        {tab === 'review' && <ReviewTab controller={controller} author={author} />}
        {tab === 'view' && <ViewTab controller={controller} view={view} onView={onView} zoom={zoom} onZoom={onZoom} gridSize={gridSize} onNewWindow={onNewWindow} />}
        {tab === 'tableDesign' && isTableActive && <TableDesignTab {...commonProps} setSummaryOpen={setSummaryOpen} />}
      </div>
    </div>
  );
};
