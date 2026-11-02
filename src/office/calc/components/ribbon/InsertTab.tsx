import React, { useRef } from 'react';
import {
  RefreshCw,
  AreaChart,
  BarChart3,
  CheckSquare,
  Eraser,
  ImagePlus,
  LineChart,
  Link2,
  Omega,
  PieChart,
  ScatterChart,
  Shapes,
  Smile,
  StickyNote,
  Table2,
  TableProperties,
  Tag,
  Trash2,
} from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { ChartType } from '../../engine/chartData';
import { prepareImage } from '../../../shared/imageImport';
import { SPECIAL_CHARACTERS } from '../../../shared/formatOptions';
import { Btn, Group, LargeBtn, Popover } from '../../../shared/ribbon/controls';
import type { RibbonTabCommonProps } from './types';
import { OPEN_CREATE_TABLE_EVENT } from '../../shortcuts';
import {
  ICONS_CATALOG,
  MATH_EQUATIONS,
  renderIconSvg,
  SHAPES_CATALOG,
} from './insertHelpers';

export interface InsertTabProps extends RibbonTabCommonProps {
  setSummaryOpen: (open: boolean) => void;
}

export const InsertTab: React.FC<InsertTabProps> = ({
  controller,
  sheetFocus,
  act,
  onMessage,
  setSummaryOpen,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const pictureInput = useRef<HTMLInputElement>(null);

  const selectedChart = controller.wb.sheets[controller.active].charts.find((c) => c.id === controller.selectedChart);
  const selectedPicture = controller.wb.sheets[controller.active].images?.find((i) => i.id === controller.selectedChart);

  const insertPicture = async (file: File) => {
    try {
      const picture = await prepareImage(file);
      controller.addImage(picture.src, picture.width, picture.height, picture.alt);
    } catch {
      onMessage(t.pictures.failed);
    }
    sheetFocus();
  };

  const insertSparklines = (type: 'line' | 'column' | 'winLoss') => {
    if (!controller.addSparklines(type)) onMessage(t.charts.noData);
    sheetFocus();
  };

  const insertChart = (type: ChartType, stacked = false) => {
    if (!controller.addChart(type, stacked)) onMessage(t.charts.noData);
    sheetFocus();
  };

  const handleInsertShape = (shapeId: string) => {
    const shape = SHAPES_CATALOG.find((s) => s.id === shapeId);
    if (!shape) return;
    const { dataUrl, width, height } = shape.render();
    controller.addImage(dataUrl, width, height, shape.name);
    sheetFocus();
  };

  const handleInsertIcon = (iconId: string) => {
    const icon = ICONS_CATALOG.find((i) => i.id === iconId);
    if (!icon) return;
    const { dataUrl, width, height } = renderIconSvg(icon);
    controller.addImage(dataUrl, width, height, icon.name);
    sheetFocus();
  };

  const handleInsertEquation = (symbol: string) => {
    const current = controller.editing ? controller.editing.text : controller.rawOfActive();
    if (controller.editing) controller.setEditText(current + symbol);
    else controller.startEdit(current + symbol);
    sheetFocus();
  };

  const handleInsertSymbol = (char: string) => {
    const current = controller.editing ? controller.editing.text : controller.rawOfActive();
    if (controller.editing) controller.setEditText(current + char);
    else controller.startEdit(current + char);
    sheetFocus();
  };

  return (
    <div className="wr-tab-body">
      {/* 1. Tables Group */}
      <Group label={t.groups.tables}>
        <LargeBtn
          title={t.insertOptions.pivotTable}
          onClick={() => setSummaryOpen(true)}
          label={t.insertOptions.pivotTable}
        >
          <TableProperties size={24} style={{ color: 'var(--fl-accent)' }} />
        </LargeBtn>
        <Btn
          title={t.summary.refresh}
          disabled={!controller.summaryConfig}
          onClick={act(() => onMessage(controller.refreshSummary() ? t.summary.refreshed : t.summary.refreshFailed))}
        >
          <RefreshCw size={16} />
        </Btn>


        <LargeBtn
          title={t.insertOptions.table}
          onClick={act(() => window.dispatchEvent(new Event(OPEN_CREATE_TABLE_EVENT)))}
          label={t.insertOptions.tableShort}
        >
          <Table2 size={24} style={{ color: 'var(--fl-accent)' }} />
        </LargeBtn>
      </Group>

      {/* 2. Illustrations Group */}
      <Group label={t.groups.illustrations}>
        <LargeBtn
          title={t.insertOptions.pictures}
          onClick={() => pictureInput.current?.click()}
          label={t.insertOptions.picturesShort}
        >
          <ImagePlus size={24} style={{ color: 'var(--fl-accent)' }} />
        </LargeBtn>
        <input
          ref={pictureInput}
          type="file"
          hidden
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void insertPicture(file);
          }}
        />

        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.shapes} onClick={toggle} label={t.insertOptions.shapesShort} hasDropdown>
              <Shapes size={24} style={{ color: 'var(--fl-accent)' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-shapes-menu">
              <span className="calc-shapes-group-title">Rectangles</span>
              <div className="calc-shapes-grid">
                {SHAPES_CATALOG.filter((s) => s.category === 'rectangles').map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className="calc-shape-item-btn"
                    onClick={() => {
                      close();
                      handleInsertShape(shape.id);
                    }}
                  >
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>

              <span className="calc-shapes-group-title">Basic Shapes</span>
              <div className="calc-shapes-grid">
                {SHAPES_CATALOG.filter((s) => s.category === 'basic').map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className="calc-shape-item-btn"
                    onClick={() => {
                      close();
                      handleInsertShape(shape.id);
                    }}
                  >
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>

              <span className="calc-shapes-group-title">Lines & Arrows</span>
              <div className="calc-shapes-grid">
                {SHAPES_CATALOG.filter((s) => s.category === 'lines' || s.category === 'arrows').map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className="calc-shape-item-btn"
                    onClick={() => {
                      close();
                      handleInsertShape(shape.id);
                    }}
                  >
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>

              <span className="calc-shapes-group-title">Callouts</span>
              <div className="calc-shapes-grid">
                {SHAPES_CATALOG.filter((s) => s.category === 'callouts').map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className="calc-shape-item-btn"
                    onClick={() => {
                      close();
                      handleInsertShape(shape.id);
                    }}
                  >
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>

        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.icons} onClick={toggle} label={t.insertOptions.iconsShort} hasDropdown>
              <Smile size={24} style={{ color: '#ffb900' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-icons-grid">
              {ICONS_CATALOG.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  className="calc-icon-item-btn"
                  title={icon.name}
                  onClick={() => {
                    close();
                    handleInsertIcon(icon.id);
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: icon.svgPath }} />
                  <span>{icon.name}</span>
                </button>
              ))}
            </div>
          )}
        </Popover>


      </Group>

      {/* 4. Charts Group */}
      <Group label={t.charts.group} onDialog={() => setSummaryOpen(true)} dialogTitle={t.charts.group}>

        <div className="calc-charts-grid">
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.insertOptions.columnChart}
            aria-label={t.charts.column}
            onClick={() => insertChart('column')}
          >
            <BarChart3 size={17} style={{ color: 'var(--fl-accent)' }} />
          </button>
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.insertOptions.lineChart}
            aria-label={t.charts.line}
            onClick={() => insertChart('line')}
          >
            <LineChart size={17} style={{ color: 'var(--fl-accent)' }} />
          </button>
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.insertOptions.pieChart}
            aria-label={t.charts.pie}
            onClick={() => insertChart('pie')}
          >
            <PieChart size={17} style={{ color: '#ffb900' }} />
          </button>
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.charts.bar}
            aria-label={t.charts.bar}
            onClick={() => insertChart('bar')}
          >
            <BarChart3 size={17} className="wr-rot-quarter" style={{ color: 'var(--fl-accent)' }} />
          </button>
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.charts.area}
            aria-label={t.charts.area}
            onClick={() => insertChart('area')}
          >
            <AreaChart size={17} style={{ color: 'var(--fl-accent)' }} />
          </button>
          <button
            type="button"
            className="calc-chart-icon-btn"
            title={t.insertOptions.scatterChart}
            aria-label={t.charts.scatter}
            onClick={() => insertChart('scatter')}
          >
            <ScatterChart size={17} style={{ color: '#d83b01' }} />
          </button>
        </div>

      </Group>

      {/* 5. Sparklines Group */}
      <Group label={t.sparklines.group}>
        <LargeBtn title={t.sparklines.line} onClick={() => insertSparklines('line')} label={t.sparklines.lineShort}>
          <LineChart size={24} style={{ color: 'var(--fl-accent)' }} />
        </LargeBtn>
        <LargeBtn title={t.sparklines.column} onClick={() => insertSparklines('column')} label={t.sparklines.columnShort}>
          <BarChart3 size={24} style={{ color: 'var(--fl-accent)' }} />
        </LargeBtn>
        <LargeBtn title={t.sparklines.winLoss} onClick={() => insertSparklines('winLoss')} label={t.sparklines.winLossShort}>
          <CheckSquare size={24} style={{ color: '#ffb900' }} />
        </LargeBtn>
        <LargeBtn title={t.sparklines.clear} onClick={() => controller.clearSparklines()} label={t.sparklines.clearShort}>
          <Eraser size={24} style={{ color: '#d83b01' }} />
        </LargeBtn>
      </Group>

      {/* 7. Links Group */}
      <Group label={t.groups.links}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.link} onClick={toggle} label={t.insertOptions.linkShort}>
              <Link2 size={24} style={{ color: 'var(--fl-accent)' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, minWidth: 260 }}
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const url = String(fd.get('url') ?? '').trim();
                controller.setLink(url === 'https://' || !url ? '' : url);
                close();
                sheetFocus();
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600 }}>{t.links.linkPrompt}</label>
              <input
                name="url"
                defaultValue={controller.linkAt(controller.activeCell.row, controller.activeCell.col) ?? 'https://'}
                autoFocus
                style={{ fontSize: 13, padding: '4px 6px', border: '1px solid var(--border-strong)', borderRadius: 4 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button type="button" className="wr-text-btn" onClick={close} style={{ fontSize: 12 }}>
                  {t.filter.cancel}
                </button>
                <button type="submit" className="wr-text-btn is-primary" style={{ fontSize: 12 }}>
                  OK
                </button>
              </div>
            </form>
          )}
        </Popover>
      </Group>

      {/* 8. Comments Group */}
      <Group label={t.insertOptions.notesGroup}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.noteShort} onClick={toggle} label={t.insertOptions.noteShort}>
              <StickyNote size={24} style={{ color: '#ffb900' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, minWidth: 260 }}
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const note = String(fd.get('note') ?? '').trim();
                controller.setNote(note);
                close();
                sheetFocus();
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600 }}>{t.notes.notePrompt}</label>
              <textarea
                name="note"
                defaultValue={controller.noteAt(controller.activeCell.row, controller.activeCell.col) ?? ''}
                autoFocus
                rows={3}
                style={{ fontSize: 13, padding: '4px 6px', border: '1px solid var(--border-strong)', borderRadius: 4, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button type="button" className="wr-text-btn" onClick={close} style={{ fontSize: 12 }}>
                  {t.filter.cancel}
                </button>
                <button type="submit" className="wr-text-btn is-primary" style={{ fontSize: 12 }}>
                  OK
                </button>
              </div>
            </form>
          )}
        </Popover>
      </Group>

      {/* 10. Symbols Group */}
      <Group label={t.groups.symbols}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.equation} onClick={toggle} label={t.insertOptions.equationShort}>
              <span style={{ fontSize: '1.4rem', fontFamily: 'serif', fontWeight: 'bold', lineHeight: 1 }}>π</span>
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-equations-grid">
              {MATH_EQUATIONS.map((eq) => (
                <button
                  key={eq.symbol}
                  type="button"
                  className="calc-equation-btn"
                  title={eq.label}
                  onClick={() => {
                    close();
                    handleInsertEquation(eq.symbol);
                  }}
                >
                  {eq.symbol}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.insertOptions.symbol} onClick={toggle} label={t.insertOptions.symbolShort}>
              <Omega size={24} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="wr-chars">
              {SPECIAL_CHARACTERS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => {
                    close();
                    handleInsertSymbol(char);
                  }}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </Popover>
      </Group>

      {/* 11. Contextual Object Control (if selected) */}
      {(selectedChart || selectedPicture) && (
        <Group label={t.charts.selected}>
          {selectedChart && (
            <Popover
              button={({ toggle }) => (
                <LargeBtn
                  title={t.charts.setTitle}
                  onClick={toggle}
                  label={t.charts.setTitle}
                >
                  <Tag size={20} />
                </LargeBtn>
              )}
            >
              {(close) => (
                <form
                  style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, minWidth: 200 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const title = String(fd.get('title') ?? '').trim();
                    if (title) controller.setChartTitle(selectedChart.id, title);
                    close();
                    sheetFocus();
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t.charts.titlePrompt}</label>
                  <input
                    name="title"
                    defaultValue={selectedChart.title}
                    autoFocus
                    className="calc-input"
                    style={{ fontSize: 13, padding: '4px 6px', border: '1px solid var(--border-strong)', borderRadius: 4 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button type="button" className="wr-text-btn" onClick={close} style={{ fontSize: 12 }}>
                      {t.filter.cancel}
                    </button>
                    <button type="submit" className="wr-text-btn is-primary" style={{ fontSize: 12 }}>
                      OK
                    </button>
                  </div>
                </form>
              )}
            </Popover>
          )}
          <LargeBtn
            title={selectedPicture ? t.pictures.delete : t.charts.delete}
            onClick={() => controller.deleteChart((selectedChart ?? selectedPicture)!.id)}
            label={t.pictures.delete}
          >
            <Trash2 size={20} style={{ color: '#d83b01' }} />
          </LargeBtn>
        </Group>
      )}
    </div>
  );
};
