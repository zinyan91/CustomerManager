import React, { useRef, useState, useSyncExternalStore } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDownAZ,
  ArrowDownToLine,
  Baseline,
  BarChart3,
  Bold,
  ChevronDown,
  ClipboardPaste,
  Copy,
  DollarSign,
  Eraser,
  Filter,
  FilterX,
  Grid3x3,
  ImagePlus,
  Italic,
  LineChart,
  ListChecks,
  Minus,
  Omega,
  PaintBucket,
  Paintbrush,
  Percent,
  PieChart,
  Plus,
  Redo2,
  RefreshCw,
  Scissors,
  Search,
  Sigma,
  Strikethrough,
  Table2,
  TableProperties,
  TableCellsMerge,
  Tag,
  Trash2,
  Underline,
  Undo2,
  WrapText,
} from 'lucide-react';
import type { ChartType } from '../engine/chartData';
import type { BorderPreset, CalcController, NewCfRule } from '../controller';
import type { CfStyle } from '../engine/conditional';
import { FORMAT_PRESETS, withDecimals } from '../engine/numberFormat';
import { NAMED_STYLES, type NamedStyle } from '../utils/cellStyles';
import { FONT_CHOICES, FONT_SIZES_PT, HIGHLIGHT_COLORS, SPECIAL_CHARACTERS, TEXT_COLORS, stepFontSize } from '../../shared/formatOptions';
import { Btn, Divider, Group, Popover, SelectBox, Swatches } from '../../shared/ribbon/controls';
import { prepareImage } from '../../shared/imageImport';
import { SummaryDialog } from './SummaryDialog';
import { ValidationDialog } from './ValidationDialog';
import { useOfficeI18n } from '../../i18n';
import { FormulasTab } from './ribbon/FormulasTab';
import { PageLayoutTab } from './ribbon/PageLayoutTab';
import { ReviewTab } from './ribbon/ReviewTab';
import { ViewTab } from './ribbon/ViewTab';
import type { ViewOptions } from './viewOptions';

export type CalcTab = 'home' | 'insert' | 'formulas' | 'pageLayout' | 'review' | 'view';

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

const DEFAULT_SIZE = 11;
const FORMAT_CODES: Array<{ key: keyof typeof FORMAT_PRESETS }> = [
  { key: 'general' },
  { key: 'number' },
  { key: 'thousands' },
  { key: 'currency' },
  { key: 'percent' },
  { key: 'date' },
  { key: 'dateLong' },
  { key: 'time' },
  { key: 'text' },
];

/** Looks for a highlight rule, and the colours of scales and bars. */
const CF_LOOKS: Record<'red' | 'yellow' | 'green' | 'bold', CfStyle> = {
  red: { fill: '#ffc7ce', color: '#9c0006' },
  yellow: { fill: '#ffeb9c', color: '#9c5700' },
  green: { fill: '#c6efce', color: '#006100' },
  bold: { color: '#c00000', bold: true },
};
const CF_SCALES = {
  redYellowGreen: { low: '#f8696b', mid: '#ffeb84', high: '#63be7b' },
  greenYellowRed: { low: '#63be7b', mid: '#ffeb84', high: '#f8696b' },
  whiteGreen: { low: '#ffffff', high: '#63be7b' },
  whiteRed: { low: '#ffffff', high: '#f8696b' },
} as const;
const CF_BARS = { blue: '#638ec6', green: '#63be7b', red: '#f8696b', orange: '#ffb628' } as const;

const BORDER_ICONS: BorderPreset[] = ['all', 'outside', 'none', 'top', 'bottom', 'left', 'right'];

export const CalcRibbon: React.FC<CalcRibbonProps> = ({ controller, zoom, onZoom, view, onView, author, onFile, onFind, onMessage, gridSize, onNewWindow }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const [tab, setTab] = useState<CalcTab>('home');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [cfLook, setCfLook] = useState<keyof typeof CF_LOOKS>('red');
  const pictureInput = useRef<HTMLInputElement>(null);

  const style = controller.activeStyle();
  const sheetFocus = () => document.querySelector<HTMLElement>('.calc-grid')?.focus({ preventScroll: true });
  /** Runs a change and gives the keyboard back to the grid, as clicking a ribbon button should. */
  const act = (fn: () => void) => () => {
    fn();
    sheetFocus();
  };

  /** Asks for a number; null when cancelled or not a number. */
  const askNumber = (message: string): number | null => {
    const answer = window.prompt(message);
    if (answer === null) return null;
    const n = Number(answer.replace(',', '.'));
    return answer.trim() !== '' && Number.isFinite(n) ? n : null;
  };
  const addRule = (rule: NewCfRule) => {
    controller.addConditionalRule(rule);
    sheetFocus();
  };
  const compareRule = (op: 'gt' | 'lt' | 'eq') => {
    const a = askNumber(t.cf.prompt.value);
    if (a !== null) addRule({ kind: 'cell', op, a, style: CF_LOOKS[cfLook] });
  };
  const rankRule = (bottom: boolean) => {
    const n = askNumber(t.cf.prompt.count);
    if (n !== null && n >= 1 && n <= 1000) addRule({ kind: 'top', n: Math.round(n), bottom, style: CF_LOOKS[cfLook] });
  };

  const pasteFromClipboard = async () => {
    try {
      controller.paste(await navigator.clipboard.readText());
      sheetFocus();
    } catch {
      onMessage(t.cmd.pasteBlocked);
    }
  };
  const copyToClipboard = (cut: boolean) => {
    const text = controller.copy(cut);
    void navigator.clipboard?.writeText(text).catch(() => {});
    sheetFocus();
  };

  const formatKey = FORMAT_CODES.find(({ key }) => FORMAT_PRESETS[key] === (style.numFmt ?? 'General'))?.key ?? 'custom';
  const formatLabels: Record<string, string> = { ...t.formats, custom: style.numFmt ?? '' };
  const size = style.fontSize ?? DEFAULT_SIZE;
  const fontLabel = style.fontFamily ?? FONT_CHOICES[0].label;
  const fontOptions = FONT_CHOICES.some((c) => c.label === fontLabel)
    ? FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))
    : [{ value: fontLabel, label: fontLabel }, ...FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))];
  const sizes = ([...FONT_SIZES_PT] as number[]).includes(size) ? [...FONT_SIZES_PT] : [size, ...FONT_SIZES_PT].sort((a, b) => a - b);

  const menu = (label: string, icon: React.ReactNode, items: Array<{ label: string; run: () => void; disabled?: boolean }>) => (
    <Popover
      button={({ toggle }) => (
        <Btn title={label} onClick={toggle}>
          {icon}
          <ChevronDown size={10} />
        </Btn>
      )}
    >
      {(close) => (
        <div className="wr-menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="wr-menu-item"
              disabled={item.disabled}
              onClick={() => {
                close();
                item.run();
                sheetFocus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );

  const home = (
    <div className="wr-tab-body">
      <Group label={t.groups.clipboard}>
        <Btn title={t.cmd.undo} disabled={!controller.canUndo} onClick={act(() => controller.undo())}>
          <Undo2 size={16} />
        </Btn>
        <Btn title={t.cmd.redo} disabled={!controller.canRedo} onClick={act(() => controller.redo())}>
          <Redo2 size={16} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.paste} onClick={() => void pasteFromClipboard()}>
          <ClipboardPaste size={16} />
        </Btn>
        <Btn title={t.cmd.cut} onClick={() => copyToClipboard(true)}>
          <Scissors size={16} />
        </Btn>
        <Btn title={t.cmd.copy} onClick={() => copyToClipboard(false)}>
          <Copy size={16} />
        </Btn>
        <Btn title={t.cmd.formatPainter} active={controller.painter !== null} onClick={act(() => controller.togglePainter())}>
          <Paintbrush size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.font}>
        <SelectBox title={t.cmd.font} width={130} value={fontLabel} onChange={(label) => controller.applyStyle({ fontFamily: label === FONT_CHOICES[0].label ? undefined : label })} options={fontOptions} />
        <SelectBox title={t.cmd.size} width={60} value={String(size)} onChange={(value) => controller.applyStyle({ fontSize: Number(value) === DEFAULT_SIZE ? undefined : Number(value) })} options={sizes.map((pt) => ({ value: String(pt), label: String(pt) }))} />
        <Btn title={t.cmd.grow} onClick={act(() => controller.applyStyle({ fontSize: stepFontSize(size, 1) }))}>
          <Plus size={14} />
        </Btn>
        <Btn title={t.cmd.shrink} onClick={act(() => controller.applyStyle({ fontSize: stepFontSize(size, -1) }))}>
          <Minus size={14} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.bold} active={!!style.bold} onClick={act(() => controller.toggleStyle('bold'))}>
          <Bold size={16} />
        </Btn>
        <Btn title={t.cmd.italic} active={!!style.italic} onClick={act(() => controller.toggleStyle('italic'))}>
          <Italic size={16} />
        </Btn>
        <Btn title={t.cmd.underline} active={!!style.underline} onClick={act(() => controller.toggleStyle('underline'))}>
          <Underline size={16} />
        </Btn>
        <Btn title={t.cmd.strike} active={!!style.strike} onClick={act(() => controller.toggleStyle('strike'))}>
          <Strikethrough size={16} />
        </Btn>
        <Divider />
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.borders} onClick={toggle}>
              <Grid3x3 size={16} />
              <ChevronDown size={10} />
            </Btn>
          )}
        >
          {(close) => (
            <div className="wr-menu">
              {BORDER_ICONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    controller.setBorders(preset);
                    sheetFocus();
                  }}
                >
                  {t.borders[preset]}
                </button>
              ))}
            </div>
          )}
        </Popover>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.fill} onClick={toggle}>
              <span className="wr-color-btn" style={{ borderBottomColor: style.fill ?? 'transparent' }}>
                <PaintBucket size={16} />
              </span>
            </Btn>
          )}
        >
          {(close) => (
            <Swatches
              colors={HIGHLIGHT_COLORS}
              current={style.fill ?? null}
              noneLabel={t.cmd.noColor}
              onPick={(color) => {
                controller.applyStyle({ fill: color ?? undefined });
                close();
                sheetFocus();
              }}
            />
          )}
        </Popover>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.color} onClick={toggle}>
              <span className="wr-color-btn" style={{ borderBottomColor: style.color ?? 'currentColor' }}>
                <Baseline size={16} />
              </span>
            </Btn>
          )}
        >
          {(close) => (
            <Swatches
              colors={TEXT_COLORS}
              current={style.color ?? null}
              noneLabel={t.cmd.noColor}
              onPick={(color) => {
                controller.applyStyle({ color: color ?? undefined });
                close();
                sheetFocus();
              }}
            />
          )}
        </Popover>
      </Group>

      <Group label={t.groups.alignment}>
        <Btn title={t.cmd.alignTop} active={style.vAlign === 'top'} onClick={act(() => controller.applyStyle({ vAlign: style.vAlign === 'top' ? undefined : 'top' }))}>
          <AlignVerticalJustifyStart size={16} />
        </Btn>
        <Btn title={t.cmd.alignMiddle} active={style.vAlign === 'middle'} onClick={act(() => controller.applyStyle({ vAlign: style.vAlign === 'middle' ? undefined : 'middle' }))}>
          <AlignVerticalJustifyCenter size={16} />
        </Btn>
        <Btn title={t.cmd.alignBottom} active={style.vAlign === 'bottom'} onClick={act(() => controller.applyStyle({ vAlign: style.vAlign === 'bottom' ? undefined : 'bottom' }))}>
          <AlignVerticalJustifyEnd size={16} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.alignLeft} active={style.hAlign === 'left'} onClick={act(() => controller.applyStyle({ hAlign: style.hAlign === 'left' ? undefined : 'left' }))}>
          <AlignLeft size={16} />
        </Btn>
        <Btn title={t.cmd.alignCenter} active={style.hAlign === 'center'} onClick={act(() => controller.applyStyle({ hAlign: style.hAlign === 'center' ? undefined : 'center' }))}>
          <AlignCenter size={16} />
        </Btn>
        <Btn title={t.cmd.alignRight} active={style.hAlign === 'right'} onClick={act(() => controller.applyStyle({ hAlign: style.hAlign === 'right' ? undefined : 'right' }))}>
          <AlignRight size={16} />
        </Btn>
        <Divider />
        <Btn title={t.cmd.wrap} active={!!style.wrap} onClick={act(() => controller.applyStyle({ wrap: !style.wrap }))}>
          <WrapText size={16} />
        </Btn>
        <Btn
          title={controller.isMerged() ? t.cmd.unmerge : t.cmd.merge}
          active={controller.isMerged()}
          onClick={act(() => {
            const merging = !controller.isMerged();
            controller.mergeSelection();
            if (merging) controller.applyStyle({ hAlign: 'center' });
          })}
        >
          <TableCellsMerge size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.number}>
        <SelectBox
          title={t.cmd.numberFormat}
          width={150}
          value={formatKey}
          onChange={(key) => key !== 'custom' && controller.setNumFmt(FORMAT_PRESETS[key as keyof typeof FORMAT_PRESETS])}
          options={[...FORMAT_CODES.map(({ key }) => ({ value: key, label: formatLabels[key] })), ...(formatKey === 'custom' ? [{ value: 'custom', label: formatLabels.custom }] : [])]}
        />
        <Btn title={t.cmd.currency} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.currency))}>
          <DollarSign size={16} />
        </Btn>
        <Btn title={t.cmd.percent} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.percent))}>
          <Percent size={16} />
        </Btn>
        <Btn title={t.cmd.comma} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.thousands))}>
          <span className="calc-btn-text">000</span>
        </Btn>
        <Btn title={t.cmd.moreDecimals} onClick={act(() => controller.setNumFmt(withDecimals(style.numFmt, 1)))}>
          <span className="calc-btn-text">.0→</span>
        </Btn>
        <Btn title={t.cmd.fewerDecimals} onClick={act(() => controller.setNumFmt(withDecimals(style.numFmt, -1)))}>
          <span className="calc-btn-text">←.0</span>
        </Btn>
      </Group>

      <Group label={t.groups.styles}>
        <Popover
          button={({ toggle }) => (
            <button type="button" className="wr-text-btn" title={t.cmd.cellStyles} onClick={toggle}>
              {t.cmd.cellStyles} <ChevronDown size={10} />
            </button>
          )}
        >
          {(close) => (
            <div className="calc-style-gallery">
              {(Object.keys(NAMED_STYLES) as NamedStyle[]).map((name) => {
                const s = NAMED_STYLES[name];
                return (
                  <button
                    key={name}
                    type="button"
                    className="calc-style-chip"
                    style={{ background: s.fill, color: s.color, fontWeight: s.bold ? 700 : undefined }}
                    onClick={() => {
                      close();
                      controller.restyle((old) => ({ ...s, numFmt: old.numFmt }));
                      sheetFocus();
                    }}
                  >
                    {t.styles[name]}
                  </button>
                );
              })}
            </div>
          )}
        </Popover>
        <Popover
          button={({ toggle }) => (
            <button type="button" className="wr-text-btn" title={t.cf.title} onClick={toggle}>
              {t.cf.title} <ChevronDown size={10} />
            </button>
          )}
        >
          {(close) => {
            const run = (fn: () => void) => () => {
              close();
              fn();
            };
            const item = (label: string, fn: () => void) => (
              <button type="button" className="wr-menu-item" onClick={run(fn)}>
                {label}
              </button>
            );
            return (
              <div className="wr-menu calc-cf-menu">
                <div className="calc-menu-heading">{t.cf.highlight}</div>
                <div className="calc-cf-looks">
                  {(Object.keys(CF_LOOKS) as Array<keyof typeof CF_LOOKS>).map((look) => (
                    <button
                      key={look}
                      type="button"
                      className={`calc-style-chip${cfLook === look ? ' is-active' : ''}`}
                      style={{ background: CF_LOOKS[look].fill, color: CF_LOOKS[look].color, fontWeight: CF_LOOKS[look].bold ? 700 : undefined }}
                      onClick={() => setCfLook(look)}
                    >
                      {t.cf.looks[look]}
                    </button>
                  ))}
                </div>
                {item(t.cf.gt, () => compareRule('gt'))}
                {item(t.cf.lt, () => compareRule('lt'))}
                {item(t.cf.eq, () => compareRule('eq'))}
                {item(t.cf.between, () => {
                  const a = askNumber(t.cf.prompt.value);
                  const b = a === null ? null : askNumber(t.cf.prompt.value2);
                  if (a !== null && b !== null) addRule({ kind: 'cell', op: 'between', a, b, style: CF_LOOKS[cfLook] });
                })}
                {item(t.cf.contains, () => {
                  const text = window.prompt(t.cf.prompt.text);
                  if (text) addRule({ kind: 'text', op: 'contains', text, style: CF_LOOKS[cfLook] });
                })}
                {item(t.cf.duplicates, () => addRule({ kind: 'duplicate', style: CF_LOOKS[cfLook] }))}
                {item(t.cf.top, () => rankRule(false))}
                {item(t.cf.bottom, () => rankRule(true))}
                <div className="calc-menu-heading">{t.cf.bars}</div>
                <div className="calc-cf-looks">
                  {(Object.keys(CF_BARS) as Array<keyof typeof CF_BARS>).map((name) => (
                    <button key={name} type="button" className="calc-style-chip" onClick={run(() => addRule({ kind: 'bar', color: CF_BARS[name] }))}>
                      <span className="calc-swatch-dot" style={{ background: CF_BARS[name] }} /> {t.cf.bar[name]}
                    </button>
                  ))}
                </div>
                <div className="calc-menu-heading">{t.cf.scales}</div>
                <div className="calc-cf-looks">
                  {(Object.keys(CF_SCALES) as Array<keyof typeof CF_SCALES>).map((name) => {
                    const sc = CF_SCALES[name];
                    const mid = 'mid' in sc ? `${sc.mid}, ` : '';
                    return (
                      <button
                        key={name}
                        type="button"
                        className="calc-style-chip"
                        style={{ background: `linear-gradient(90deg, ${sc.low}, ${mid}${sc.high})`, color: '#1f2328' }}
                        onClick={run(() => addRule({ kind: 'scale', ...sc }))}
                      >
                        {t.cf.scale[name]}
                      </button>
                    );
                  })}
                </div>
                <div className="calc-menu-sep" />
                {item(t.cf.clearSelection, () => controller.clearConditional('selection'))}
                {item(t.cf.clearSheet, () => controller.clearConditional('sheet'))}
              </div>
            );
          }}
        </Popover>
        <Btn title={t.cmd.formatAsTable} onClick={act(() => controller.formatAsTable())}>
          <Table2 size={16} />
        </Btn>
      </Group>

      <Group label={t.groups.cells}>
        {menu(t.cmd.insert, <Plus size={16} />, [
          { label: t.cmd.insertRows, run: () => controller.insertRows() },
          { label: t.cmd.insertColumns, run: () => controller.insertColumns() },
          { label: t.cmd.insertSheet, run: () => controller.addSheet() },
        ])}
        {menu(t.cmd.delete, <Trash2 size={16} />, [
          { label: t.cmd.deleteRows, run: () => controller.deleteRows() },
          { label: t.cmd.deleteColumns, run: () => controller.deleteColumns() },
          {
            label: t.cmd.deleteSheet,
            disabled: controller.wb.sheets.length <= 1,
            run: () => window.confirm(t.sheet.confirmDelete(controller.wb.sheets[controller.active].name)) && controller.deleteSheet(controller.active),
          },
        ])}
        {menu(t.cmd.format, <span className="calc-btn-text">▤</span>, [
          {
            label: t.cmd.autofit,
            run: () => {
              const { c1, c2 } = controller.selection;
              for (let c = c1; c <= c2; c += 1) controller.autofitColumn(c);
            },
          },
          {
            label: t.cmd.columnWidth,
            run: () => {
              const answer = window.prompt(t.cmd.columnWidthPrompt, String(controller.wb.sheets[controller.active].colWidths.get(controller.selection.c1) ?? 100));
              const width = Number(answer);
              if (answer !== null && Number.isFinite(width) && width > 0) {
                const { c1, c2 } = controller.selection;
                for (let c = c1; c <= c2; c += 1) controller.setColumnWidth(c, width);
              }
            },
          },
        ])}
      </Group>

      <Group label={t.groups.editing}>
        <Btn title={t.cmd.autoSum} onClick={act(() => controller.autoSum('SUM'))}>
          <Sigma size={16} />
        </Btn>
        {menu(t.cmd.autoSum, <span className="calc-btn-text">Σ</span>, [
          { label: t.cmd.sum, run: () => controller.autoSum('SUM') },
          { label: t.cmd.average, run: () => controller.autoSum('AVERAGE') },
          { label: t.cmd.count, run: () => controller.autoSum('COUNT') },
          { label: t.cmd.max, run: () => controller.autoSum('MAX') },
          { label: t.cmd.min, run: () => controller.autoSum('MIN') },
        ])}
        {menu(t.cmd.fillMenu, <ArrowDownToLine size={16} />, [
          { label: t.cmd.fillDown, run: () => controller.fillDown() },
          { label: t.cmd.fillRight, run: () => controller.fillRight() },
        ])}
        {menu(t.cmd.clear, <Eraser size={16} />, [
          { label: t.cmd.clearAll, run: () => controller.clearAll() },
          { label: t.cmd.clearFormats, run: () => controller.clearFormats() },
          { label: t.cmd.clearContents, run: () => controller.clearContents() },
        ])}
        {menu(t.cmd.sortFilter, <ArrowDownAZ size={16} />, [
          { label: t.cmd.sortAsc, run: () => controller.sortSelection(0, true) },
          { label: t.cmd.sortDesc, run: () => controller.sortSelection(0, false) },
        ])}
        <Btn
          title={t.filter.toggle}
          active={!!controller.filter}
          onClick={() => {
            if (!controller.toggleFilter()) onMessage(t.filter.noData);
            sheetFocus();
          }}
        >
          <Filter size={16} />
        </Btn>
        <Btn title={t.filter.clearAll} disabled={!controller.filterActive} onClick={act(() => controller.clearFilterCriteria())}>
          <FilterX size={16} />
        </Btn>
        <Btn title={t.cmd.find} onClick={onFind}>
          <Search size={16} />
        </Btn>
      </Group>
    </div>
  );

  const insertChart = (type: ChartType) => {
    if (!controller.addChart(type)) onMessage(t.charts.noData);
    sheetFocus();
  };
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

  const insert = (
    <div className="wr-tab-body">
      <Group label={t.charts.group}>
        <Btn title={t.charts.column} onClick={() => insertChart('column')}>
          <BarChart3 size={16} />
        </Btn>
        <Btn title={t.charts.bar} onClick={() => insertChart('bar')}>
          <BarChart3 size={16} className="wr-rot-quarter" />
        </Btn>
        <Btn title={t.charts.line} onClick={() => insertChart('line')}>
          <LineChart size={16} />
        </Btn>
        <Btn title={t.charts.pie} onClick={() => insertChart('pie')}>
          <PieChart size={16} />
        </Btn>
      </Group>
      <Group label={t.summary.title}>
        <Btn title={t.summary.open} onClick={() => setSummaryOpen(true)}>
          <TableProperties size={16} />
        </Btn>
        <Btn
          title={t.summary.refresh}
          disabled={!controller.summaryConfig}
          onClick={act(() => {
            onMessage(controller.refreshSummary() ? t.summary.refreshed : t.summary.refreshFailed);
          })}
        >
          <RefreshCw size={16} />
        </Btn>
      </Group>
      <Group label={t.validation.title}>
        <Btn title={t.validation.open} onClick={() => setValidationOpen(true)}>
          <ListChecks size={16} />
        </Btn>
      </Group>
      <Group label={t.pictures.group}>
        <Btn title={t.pictures.insert} onClick={() => pictureInput.current?.click()}>
          <ImagePlus size={16} />
        </Btn>
        {selectedPicture && (
          <Btn title={t.pictures.delete} onClick={() => controller.deleteChart(selectedPicture.id)}>
            <Trash2 size={16} />
          </Btn>
        )}
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
      </Group>
      {selectedChart && (
        <Group label={t.charts.selected}>
          <Btn
            title={t.charts.setTitle}
            onClick={() => {
              const title = window.prompt(t.charts.titlePrompt, selectedChart.title);
              if (title !== null) controller.setChartTitle(selectedChart.id, title);
              sheetFocus();
            }}
          >
            <Tag size={16} />
          </Btn>
          <Btn title={t.charts.delete} onClick={() => controller.deleteChart(selectedChart.id)}>
            <Trash2 size={16} />
          </Btn>
        </Group>
      )}
      <Group label={t.groups.tables}>
        <Btn title={t.cmd.formatAsTable} onClick={act(() => controller.formatAsTable())}>
          <Table2 size={16} />
        </Btn>
      </Group>
      <Group label={t.groups.symbols}>
        <Popover
          button={({ toggle }) => (
            <Btn title={t.cmd.symbol} onClick={toggle}>
              <Omega size={16} />
            </Btn>
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
                    const current = controller.editing ? controller.editing.text : controller.rawOfActive();
                    if (controller.editing) controller.setEditText(current + char);
                    else controller.startEdit(current + char);
                  }}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </Popover>
      </Group>
    </div>
  );

  const tabs: Array<{ id: CalcTab; label: string }> = [
    { id: 'home', label: t.tabs.home },
    { id: 'insert', label: t.tabs.insert },
    { id: 'formulas', label: m.ribbon.tabs.formulas },
    { id: 'pageLayout', label: m.ribbon.tabs.pageLayout },
    { id: 'review', label: m.ribbon.tabs.review },
    { id: 'view', label: t.tabs.view },
  ];

  return (
    <div className="wr-ribbon calc-ribbon">
      <div className="wr-tabs" role="tablist">
        <button type="button" className="wr-tab wr-tab-file" onClick={onFile}>
          {t.tabs.file}
        </button>
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`wr-tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {validationOpen && <ValidationDialog controller={controller} onClose={() => setValidationOpen(false)} />}
      {summaryOpen && <SummaryDialog controller={controller} onClose={() => setSummaryOpen(false)} onMessage={onMessage} />}
      <div className="wr-tab-panel" role="tabpanel">
        {tab === 'home' && home}
        {tab === 'insert' && insert}
        {tab === 'formulas' && <FormulasTab controller={controller} view={view} onView={onView} />}
        {tab === 'pageLayout' && <PageLayoutTab controller={controller} view={view} onView={onView} />}
        {tab === 'review' && <ReviewTab controller={controller} author={author} />}
        {tab === 'view' && <ViewTab controller={controller} view={view} onView={onView} zoom={zoom} onZoom={onZoom} gridSize={gridSize} onNewWindow={onNewWindow} />}
      </div>
    </div>
  );
};
