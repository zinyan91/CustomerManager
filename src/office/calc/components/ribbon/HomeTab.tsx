import React from 'react';
import {
  Redo2,
  Undo2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpAZ,
  Baseline,
  Bold,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  DollarSign,
  Eraser,
  Filter,
  FilterX,
  Grid3x3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Layers,
  Link,
  MessageSquare,
  MousePointer,
  PaintBucket,
  Paintbrush,
  Percent,
  Replace,
  RotateCcw,
  RotateCw,
  Scissors,
  Search,
  Sigma,
  Table2,
  TableCellsMerge,
  Underline,
  Unlink,
  WrapText,
  Zap,
} from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { BorderPreset } from '../../controller';
import { parseRange } from '../../engine/cellRef';
import { FORMAT_PRESETS, withDecimals } from '../../engine/numberFormat';
import { DEFAULT_COL_WIDTH, ROW_HEIGHT } from '../../model/workbook';
import { FONT_CHOICES, FONT_SIZES_PT, HIGHLIGHT_COLORS, TEXT_COLORS, stepFontSize } from '../../../shared/formatOptions';
import { Btn, ButtonRow, Divider, Group, LargeBtn, Popover, SelectBox, Swatches } from '../../../shared/ribbon/controls';
import { CellStylesGallery } from '../CellStylesGallery';
import { TableStylesGallery } from '../TableStylesGallery';
import { ConditionalFormattingMenu } from './ConditionalFormattingMenu';
import { promptColumnWidth, promptRowHeight, promptDefaultWidth } from '../layoutPrompts';
import {
  RibbonInsertIcon,
  RibbonDeleteIcon,
  RibbonFormatIcon,
  InsertCellIcon,
  InsertRowIcon,
  InsertColIcon,
  InsertSheetIcon,
  DeleteCellIcon,
  DeleteRowIcon,
  DeleteColIcon,
  DeleteSheetIcon,
  RowHeightIcon,
  ColWidthIcon,
  RenameSheetIcon,
  ProtectSheetIcon,
  LockCellIcon,
  FormatCellsIcon,
} from './CellIcons';
import type { RibbonTabCommonProps } from './types';

export interface HomeTabProps extends RibbonTabCommonProps {
  onFind: () => void;
  setSortOpen: (open: boolean) => void;
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

const BORDER_ICONS: BorderPreset[] = ['all', 'outside', 'thickOutside', 'none', 'top', 'bottom', 'thickBottom', 'doubleBottom', 'topBottom', 'left', 'right', 'diagonalDown', 'diagonalUp'];

export const HomeTab: React.FC<HomeTabProps> = ({ controller, sheetFocus, act, onMessage, openFormatWithTab, onFind, setSortOpen }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const style = controller.activeStyle();

  const size = style.fontSize ?? DEFAULT_SIZE;
  const fontLabel = style.fontFamily ?? FONT_CHOICES[0].label;
  const fontOptions = FONT_CHOICES.some((c) => c.label === fontLabel)
    ? FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))
    : [{ value: fontLabel, label: fontLabel }, ...FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))];
  const sizes = ([...FONT_SIZES_PT] as number[]).includes(size) ? [...FONT_SIZES_PT] : [size, ...FONT_SIZES_PT].sort((a, b) => a - b);

  const formatKey = FORMAT_CODES.find(({ key }) => FORMAT_PRESETS[key] === (style.numFmt ?? 'General'))?.key ?? 'custom';
  const formatLabels: Record<string, string> = { ...t.formats, custom: style.numFmt ?? '' };

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

  return (
    <div className="wr-tab-body">
      <Group label={t.groups.undo}>
        <Btn title={t.cmd.undo} disabled={!controller.canUndo} onClick={act(() => controller.undo())}>
          <Undo2 size={16} />
        </Btn>
        <Btn title={t.cmd.redo} disabled={!controller.canRedo} onClick={act(() => controller.redo())}>
          <Redo2 size={16} />
        </Btn>
      </Group>
      <Group label={t.groups.clipboard} onDialog={() => void pasteFromClipboard()} dialogTitle={t.cmd.pasteSpecial}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.paste} onClick={toggle} label={t.cmd.paste} hasDropdown>
              <ClipboardPaste size={32} style={{ color: '#d97706' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="wr-menu">
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  void pasteFromClipboard();
                }}
              >
                {t.cmd.paste} (Ctrl+V)
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.pasteSpecial('values');
                  sheetFocus();
                }}
              >
                {t.cmd.pasteValues}
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.pasteSpecial('formulas');
                  sheetFocus();
                }}
              >
                {t.cmd.pasteFormulas}
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.pasteSpecial('formats');
                  sheetFocus();
                }}
              >
                {t.cmd.pasteFormats}
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.pasteSpecial('transpose');
                  sheetFocus();
                }}
              >
                {t.cmd.pasteTranspose}
              </button>
            </div>
          )}
        </Popover>

        <div className="calc-clipboard-col">
          <button type="button" className="calc-ribbon-sub-btn" title={t.cmd.cut} onClick={() => copyToClipboard(true)}>
            <Scissors size={15} />
            <span>{t.cmd.cut.split(' ')[0]}</span>
          </button>
          <button type="button" className="calc-ribbon-sub-btn" title={t.cmd.copy} onClick={() => copyToClipboard(false)}>
            <Copy size={15} />
            <span>{t.cmd.copy.split(' ')[0]}</span>
          </button>
          <button
            type="button"
            className={`calc-ribbon-sub-btn${controller.painter !== null ? ' is-active' : ''}`}
            title={t.cmd.formatPainter}
            onClick={act(() => controller.togglePainter())}
          >
            <Paintbrush size={15} style={{ color: '#d97706' }} />
            <span>{t.cmd.formatPainter}</span>
          </button>
        </div>
      </Group>

      <Group label={t.groups.font} onDialog={() => openFormatWithTab('font')} dialogTitle={t.formatCells.title}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ButtonRow>
            <SelectBox title={t.cmd.font} width={115} value={fontLabel} onChange={(label) => controller.applyStyle({ fontFamily: label === FONT_CHOICES[0].label ? undefined : label })} options={fontOptions} />
            <SelectBox title={t.cmd.size} width={56} value={String(size)} onChange={(value) => controller.applyStyle({ fontSize: Number(value) === DEFAULT_SIZE ? undefined : Number(value) })} options={sizes.map((pt) => ({ value: String(pt), label: String(pt) }))} />
            <Btn title={t.cmd.grow} onClick={act(() => controller.applyStyle({ fontSize: stepFontSize(size, 1) }))}>
              <span className="calc-grow-font-icon">A<span className="calc-font-arrow-up">▲</span></span>
            </Btn>
            <Btn title={t.cmd.shrink} onClick={act(() => controller.applyStyle({ fontSize: stepFontSize(size, -1) }))}>
              <span className="calc-shrink-font-icon">A<span className="calc-font-arrow-down">▼</span></span>
            </Btn>
          </ButtonRow>
        <ButtonRow>
          <Btn title={t.cmd.bold} active={!!style.bold} onClick={act(() => controller.toggleStyle('bold'))}>
            <Bold size={15} />
          </Btn>
          <Btn title={t.cmd.italic} active={!!style.italic} onClick={act(() => controller.toggleStyle('italic'))}>
            <Italic size={15} />
          </Btn>
          <Popover
            button={({ toggle }) => (
              <Btn title={t.cmd.underline} active={!!style.underline} onClick={toggle}>
                <Underline size={15} />
                <ChevronDown size={8} />
              </Btn>
            )}
          >
            {(close) => (
              <div className="wr-menu">
                <button
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    controller.toggleStyle('underline');
                    sheetFocus();
                  }}
                >
                  {t.cmd.underline}
                </button>
                <button
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    controller.toggleStyle('strike');
                    sheetFocus();
                  }}
                >
                  {t.cmd.strike}
                </button>
              </div>
            )}
          </Popover>

          <Divider />

          <Popover
            button={({ toggle }) => (
              <Btn title={t.cmd.borders} onClick={toggle}>
                <Grid3x3 size={15} />
                <ChevronDown size={8} />
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

          <Divider />

          <Popover
            button={({ toggle }) => (
              <Btn title={t.cmd.fill} onClick={toggle}>
                <span className="calc-color-btn-icon">
                  <PaintBucket size={15} />
                  <span className="calc-color-bar" style={{ backgroundColor: style.fill ?? '#ffc000' }} />
                </span>
                <ChevronDown size={8} />
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
                <span className="calc-color-btn-icon">
                  <Baseline size={15} />
                  <span className="calc-color-bar" style={{ backgroundColor: style.color ?? '#c00000' }} />
                </span>
                <ChevronDown size={8} />
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
        </ButtonRow>
        </div>
      </Group>

      <Group label={t.groups.alignment} onDialog={() => openFormatWithTab('alignment')} dialogTitle={t.formatCells.title}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ButtonRow>
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
            <Popover
              button={({ toggle }) => (
                <Btn title={t.cmd.rotateUp} active={style.rotation !== undefined && style.rotation !== 0} onClick={toggle}>
                  <RotateCcw size={16} />
                  <ChevronDown size={8} />
                </Btn>
              )}
            >
              {(close) => (
                <div className="wr-menu">
                  <button type="button" className="wr-menu-item" onClick={() => { close(); controller.setRotation(45); sheetFocus(); }}>
                    +45°
                  </button>
                  <button type="button" className="wr-menu-item" onClick={() => { close(); controller.setRotation(-45); sheetFocus(); }}>
                    -45°
                  </button>
                  <button type="button" className="wr-menu-item" onClick={() => { close(); controller.setRotation(90); sheetFocus(); }}>
                    +90°
                  </button>
                  <button type="button" className="wr-menu-item" onClick={() => { close(); controller.setRotation(undefined); sheetFocus(); }}>
                    0°
                  </button>
                </div>
              )}
            </Popover>
          </ButtonRow>
          <ButtonRow>
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
            <Btn title={t.cmd.decreaseIndent} onClick={act(() => controller.changeIndent(-1))}>
              <IndentDecrease size={16} />
            </Btn>
            <Btn title={t.cmd.increaseIndent} onClick={act(() => controller.changeIndent(1))}>
              <IndentIncrease size={16} />
            </Btn>
          </ButtonRow>
        </div>

        <Divider />

        <div className="calc-align-actions">
          <button
            type="button"
            className={`calc-ribbon-sub-btn${style.wrap ? ' is-active' : ''}`}
            title={t.cmd.wrap}
            onClick={act(() => controller.applyStyle({ wrap: !style.wrap }))}
          >
            <WrapText size={16} />
            <span>{t.cmd.wrapShort}</span>
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              className={`calc-ribbon-sub-btn${controller.isMerged() ? ' is-active' : ''}`}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: 4 }}
              title={controller.isMerged() ? t.cmd.unmerge : t.cmd.merge}
              onMouseDown={(e) => e.preventDefault()}
              onClick={act(() => {
                if (controller.isMerged()) {
                  controller.unmergeSelection();
                } else {
                  const { r1, r2, c1, c2 } = controller.selection;
                  if (r1 === r2 && c1 === c2) {
                    onMessage(t.cmd.selectMultipleToMerge);
                    return;
                  }
                  controller.mergeSelection();
                  controller.applyStyle({ hAlign: 'center' });
                }
              })}
            >
              <TableCellsMerge size={16} />
              <span>{t.cmd.mergeShort}</span>
            </button>
            <Popover
              button={({ toggle }) => (
                <button
                  type="button"
                  className={`calc-ribbon-sub-btn${controller.isMerged() ? ' is-active' : ''}`}
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingLeft: 2, paddingRight: 4, marginLeft: -1 }}
                  title={t.cmd.merge}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggle}
                >
                  <ChevronDown size={8} />
                </button>
              )}
            >
              {(close) => (
                <div className="wr-menu">
                  <button
                    type="button"
                    className="wr-menu-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      close();
                      const { r1, r2, c1, c2 } = controller.selection;
                      if (r1 === r2 && c1 === c2 && !controller.isMerged()) {
                        onMessage(t.cmd.selectMultipleToMerge);
                        return;
                      }
                      if (controller.isMerged()) {
                        controller.unmergeSelection();
                      } else {
                        controller.mergeSelection();
                        controller.applyStyle({ hAlign: 'center' });
                      }
                      sheetFocus();
                    }}
                  >
                    <TableCellsMerge size={14} />
                    {t.cmd.merge}
                  </button>
                  <button
                    type="button"
                    className="wr-menu-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      close();
                      const { c1, c2 } = controller.selection;
                      if (c1 === c2) {
                        onMessage(t.cmd.selectMultipleToMerge);
                        return;
                      }
                      controller.mergeAcross();
                      sheetFocus();
                    }}
                  >
                    <TableCellsMerge size={14} />
                    {t.cmd.mergeAcross}
                  </button>
                  <button
                    type="button"
                    className="wr-menu-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      close();
                      const { r1, r2, c1, c2 } = controller.selection;
                      if (r1 === r2 && c1 === c2 && !controller.isMerged()) {
                        onMessage(t.cmd.selectMultipleToMerge);
                        return;
                      }
                      controller.mergeSelection();
                      sheetFocus();
                    }}
                  >
                    <TableCellsMerge size={14} />
                    {t.cmd.mergeCellsOnly}
                  </button>
                  <button
                    type="button"
                    className="wr-menu-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      close();
                      controller.unmergeSelection();
                      sheetFocus();
                    }}
                  >
                    <TableCellsMerge size={14} />
                    {t.cmd.unmerge}
                  </button>
                </div>
              )}
            </Popover>
          </div>
        </div>
      </Group>

      <Group label={t.groups.number} onDialog={() => openFormatWithTab('number')} dialogTitle={t.formatCells.title}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ButtonRow>
            <SelectBox
              title={t.cmd.numberFormat}
              width={104}
              value={formatKey}
              onChange={(key) => key !== 'custom' && controller.setNumFmt(FORMAT_PRESETS[key as keyof typeof FORMAT_PRESETS])}
              options={[...FORMAT_CODES.map(({ key }) => ({ value: key, label: formatLabels[key] })), ...(formatKey === 'custom' ? [{ value: 'custom', label: formatLabels.custom }] : [])]}
            />
          </ButtonRow>
          <ButtonRow>
            <Btn title={t.cmd.currency} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.currency))}>
              <DollarSign size={15} />
            </Btn>
            <Btn title={t.cmd.percent} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.percent))}>
              <Percent size={15} />
            </Btn>
            <Btn title={t.cmd.comma} onClick={act(() => controller.setNumFmt(FORMAT_PRESETS.thousands))}>
              <span style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1 }}>,</span>
            </Btn>
            <Btn title={t.cmd.moreDecimals} onClick={act(() => controller.setNumFmt(withDecimals(style.numFmt, 1)))}>
              <span className="calc-decimal-icon">←.00</span>
            </Btn>
            <Btn title={t.cmd.fewerDecimals} onClick={act(() => controller.setNumFmt(withDecimals(style.numFmt, -1)))}>
              <span className="calc-decimal-icon">.00→</span>
            </Btn>
          </ButtonRow>
        </div>
      </Group>

      <Group label={t.groups.styles}>
        <ConditionalFormattingMenu controller={controller} onApply={sheetFocus} onMessage={onMessage} />
        <TableStylesGallery controller={controller} onApply={sheetFocus} />
        <CellStylesGallery controller={controller} onApply={sheetFocus} onOpenFormatCells={() => openFormatWithTab('font')} />
      </Group>

      <Group label={t.groups.cells}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.insert} onClick={toggle} label={t.cmd.insert} hasDropdown>
              <RibbonInsertIcon />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-cells-menu" role="menu">
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  const { r1, r2 } = controller.selection;
                  if (r1 === 0 && r2 >= 500) controller.insertColumns();
                  else controller.insertRows();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><InsertCellIcon /></span>
                <span>{t.cmd.insertCells}</span>
              </button>
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  controller.insertRows();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><InsertRowIcon /></span>
                <span>{t.cmd.insertSheetRows}</span>
              </button>
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  controller.insertColumns();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><InsertColIcon /></span>
                <span>{t.cmd.insertSheetColumns}</span>
              </button>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  controller.addSheet();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><InsertSheetIcon /></span>
                <span>{t.cmd.insertSheet}</span>
              </button>
            </div>
          )}
        </Popover>

        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.delete} onClick={toggle} label={t.cmd.delete} hasDropdown>
              <RibbonDeleteIcon />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-cells-menu" role="menu">
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  const { r1, r2 } = controller.selection;
                  if (r1 === 0 && r2 >= 500) controller.deleteColumns();
                  else controller.deleteRows();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><DeleteCellIcon /></span>
                <span>{t.cmd.deleteCells}</span>
              </button>
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  controller.deleteRows();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><DeleteRowIcon /></span>
                <span>{t.cmd.deleteSheetRows}</span>
              </button>
              <button
                type="button"
                className="calc-cells-menu-item"
                onClick={() => {
                  close();
                  controller.deleteColumns();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><DeleteColIcon /></span>
                <span>{t.cmd.deleteSheetColumns}</span>
              </button>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cells-menu-item"
                disabled={controller.wb.sheets.length <= 1}
                onClick={() => {
                  close();
                  if (controller.wb.sheets.length <= 1) return;
                  if (window.confirm(t.sheet.confirmDelete(controller.wb.sheets[controller.active].name))) {
                    controller.deleteSheet(controller.active);
                  }
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon"><DeleteSheetIcon /></span>
                <span>{t.cmd.deleteSheet}</span>
              </button>
            </div>
          )}
        </Popover>

        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.format} onClick={toggle} label={t.cmd.format} hasDropdown>
              <RibbonFormatIcon />
            </LargeBtn>
          )}
        >
          {(close) => {
            const isProtected = !!controller.wb.sheets[controller.active]?.protected;
            const activeCellPos = controller.activeCell;
            const activeCellData = controller.wb.getCell(controller.active, activeCellPos.row, activeCellPos.col);
            const isCellLocked = !controller.wb.styleOf(activeCellData?.style ?? 0).unlocked;

            return (
              <div className="calc-cells-menu" role="menu">
                {/* Cell Size */}
                <div className="calc-menu-group-header">{t.cmd.cellSize}</div>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    promptRowHeight(controller, t.cmd, ROW_HEIGHT);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon"><RowHeightIcon /></span>
                  <span>{t.cmd.rowHeight}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    const { r1, r2 } = controller.selection;
                    for (let r = r1; r <= r2; r += 1) controller.autofitRow(r);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.autoFitRowHeight}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    promptColumnWidth(controller, t.cmd, DEFAULT_COL_WIDTH);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon"><ColWidthIcon /></span>
                  <span>{t.cmd.columnWidth}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    const { c1, c2 } = controller.selection;
                    for (let c = c1; c <= c2; c += 1) controller.autofitColumn(c);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.autoFitColumnWidth}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    promptDefaultWidth(controller, t.cmd.defaultWidthPrompt, DEFAULT_COL_WIDTH);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.defaultWidth}</span>
                </button>

                <div className="calc-menu-sep" />

                {/* Visibility */}
                <div className="calc-menu-group-header">{t.cmd.visibility}</div>
                <div className="calc-menu-item-with-submenu">
                  <div className="calc-cells-menu-item">
                    <span className="calc-menu-icon-spacer" />
                    <span>{t.cmd.hideUnhide}</span>
                    <span className="calc-menu-arrow"><ChevronRight size={14} /></span>
                  </div>
                  <div className="calc-submenu">
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      onClick={() => {
                        close();
                        controller.hideRows();
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.hideRows.replace(/\s*\(.*\)/, '')}</span>
                    </button>
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      onClick={() => {
                        close();
                        controller.hideColumns();
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.hideColumns.replace(/\s*\(.*\)/, '')}</span>
                    </button>
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      onClick={() => {
                        close();
                        controller.unhideRows();
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.unhideRows.replace(/\s*\(.*\)/, '')}</span>
                    </button>
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      onClick={() => {
                        close();
                        controller.unhideColumns();
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.unhideColumns.replace(/\s*\(.*\)/, '')}</span>
                    </button>
                    <div className="calc-menu-sep" />
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      disabled={controller.wb.sheets.filter((s) => !s.hidden).length <= 1}
                      onClick={() => {
                        close();
                        controller.setSheetHidden(controller.active, true);
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.hideSheet}</span>
                    </button>
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      disabled={!controller.wb.sheets.some((s) => s.hidden)}
                      onClick={() => {
                        close();
                        const hiddenIdx = controller.wb.sheets.findIndex((s) => s.hidden);
                        if (hiddenIdx >= 0) controller.setSheetHidden(hiddenIdx, false);
                        sheetFocus();
                      }}
                    >
                      <span>{t.cmd.unhideSheet}</span>
                    </button>
                  </div>
                </div>

                <div className="calc-menu-sep" />

                {/* Organize Sheets */}
                <div className="calc-menu-group-header">{t.cmd.organizeSheets}</div>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    const cur = controller.wb.sheets[controller.active].name;
                    const name = window.prompt(t.sheet.renamePrompt, cur);
                    if (name && name.trim() && name !== cur) {
                      if (!controller.renameSheet(controller.active, name.trim())) onMessage(t.sheet.invalidName);
                    }
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon"><RenameSheetIcon /></span>
                  <span>{t.cmd.renameSheet}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    controller.duplicateSheet(controller.active);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.moveCopySheet}</span>
                </button>
                <div className="calc-menu-item-with-submenu">
                  <div className="calc-cells-menu-item">
                    <span className="calc-menu-icon-spacer" />
                    <span>{t.cmd.tabColor}</span>
                    <span className="calc-menu-arrow"><ChevronRight size={14} /></span>
                  </div>
                  <div className="calc-submenu">
                    <div className="calc-tab-color-grid">
                      {['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="calc-tab-color-item"
                          style={{ background: color }}
                          title={color}
                          onClick={() => {
                            close();
                            controller.setTabColor(controller.active, color);
                            sheetFocus();
                          }}
                        />
                      ))}
                    </div>
                    <div className="calc-menu-sep" />
                    <button
                      type="button"
                      className="calc-cells-menu-item"
                      onClick={() => {
                        close();
                        controller.setTabColor(controller.active, null);
                        sheetFocus();
                      }}
                    >
                      <span>{t.sheet.noTabColor}</span>
                    </button>
                  </div>
                </div>

                <div className="calc-menu-sep" />

                {/* Protection */}
                <div className="calc-menu-group-header">{t.cmd.protectionHeading}</div>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    controller.setProtected(!isProtected);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon"><ProtectSheetIcon /></span>
                  <span>{t.cmd.protectSheet}</span>
                </button>
                <button
                  type="button"
                  className={`calc-cells-menu-item${isCellLocked ? ' is-checked' : ''}`}
                  onClick={() => {
                    close();
                    controller.setLocked(!isCellLocked);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon"><LockCellIcon isLocked={isCellLocked} /></span>
                  <span>{t.cmd.lockCell}</span>
                </button>
                <button
                  type="button"
                  className="calc-cells-menu-item"
                  onClick={() => {
                    close();
                    openFormatWithTab('number');
                  }}
                >
                  <span className="calc-menu-icon"><FormatCellsIcon /></span>
                  <span>{t.formatCells.title}…</span>
                </button>
              </div>
            );
          }}
        </Popover>
      </Group>


      <Group label={t.groups.editing}>
        <div className="calc-editing-col">
          <Popover
            button={({ toggle }) => (
              <button type="button" className="calc-ribbon-sub-btn" title={t.cmd.autoSum} onClick={toggle}>
                <Sigma size={16} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.autoSum}</span>
                <ChevronDown size={8} />
              </button>
            )}
          >
            {(close) => (
              <div className="wr-menu calc-editing-menu">
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.autoSum('SUM'); sheetFocus(); }}>
                  <Sigma size={15} style={{ color: 'var(--fl-accent)' }} />
                  <span>{t.cmd.sum}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.autoSum('AVERAGE'); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.average}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.autoSum('COUNT'); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.countNumbers}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.autoSum('MAX'); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.max}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.autoSum('MIN'); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.min}</span>
                </button>
                <div className="wr-file-sep" />
                <button
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    controller.startEdit('=');
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.moreFunctions}</span>
                </button>
              </div>
            )}
          </Popover>

          <Popover
            button={({ toggle }) => (
              <button type="button" className="calc-ribbon-sub-btn" title={t.cmd.fillMenu} onClick={toggle}>
                <ArrowDownToLine size={16} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.fillMenu}</span>
                <ChevronDown size={8} />
              </button>
            )}
          >
            {(close) => (
              <div className="wr-menu calc-editing-menu">
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.fillDown(); sheetFocus(); }}>
                  <ArrowDown size={15} style={{ color: 'var(--fl-accent)' }} />
                  <span>{t.cmd.fillDown}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.fillRight(); sheetFocus(); }}>
                  <ArrowRight size={15} style={{ color: 'var(--fl-accent)' }} />
                  <span>{t.cmd.fillRight}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.fillUp(); sheetFocus(); }}>
                  <ArrowUp size={15} style={{ color: 'var(--fl-accent)' }} />
                  <span>{t.cmd.fillUp}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.fillLeft(); sheetFocus(); }}>
                  <ArrowLeft size={15} style={{ color: 'var(--fl-accent)' }} />
                  <span>{t.cmd.fillLeft}</span>
                </button>
                <button type="button" className="wr-menu-item" disabled>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.acrossWorksheets}</span>
                </button>
                <div className="wr-file-sep" />
                <button
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    const target = controller.selection;
                    controller.fillSeries(target, target);
                    sheetFocus();
                  }}
                >
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.series}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.justify}</span>
                </button>
                <button
                  type="button"
                  className="wr-menu-item"
                  onClick={() => {
                    close();
                    controller.flashFill();
                    sheetFocus();
                  }}
                >
                  <Zap size={15} style={{ color: '#ff8c00' }} />
                  <span>{t.cmd.flashFill}</span>
                </button>
              </div>
            )}
          </Popover>

          <Popover
            button={({ toggle }) => (
              <button type="button" className="calc-ribbon-sub-btn" title={t.cmd.clear} onClick={toggle}>
                <Eraser size={16} style={{ color: '#8e44ad' }} />
                <span>{t.cmd.clear}</span>
                <ChevronDown size={8} />
              </button>
            )}
          >
            {(close) => (
              <div className="wr-menu calc-editing-menu">
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearAll(); sheetFocus(); }}>
                  <Eraser size={15} style={{ color: '#8e44ad' }} />
                  <span>{t.cmd.clearAll}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearFormats(); sheetFocus(); }}>
                  <Percent size={15} style={{ color: '#8e44ad' }} />
                  <span>{t.cmd.clearFormats}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearContents(); sheetFocus(); }}>
                  <span className="calc-menu-icon-spacer" />
                  <span>{t.cmd.clearContents}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearComments(); sheetFocus(); }}>
                  <MessageSquare size={15} style={{ color: '#8e44ad' }} />
                  <span>{t.cmd.clearComments}</span>
                </button>
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearHyperlinks(); sheetFocus(); }}>
                  <Link size={15} style={{ color: '#8e44ad' }} />
                  <span>{t.cmd.clearHyperlinks}</span>
                </button>
                <div className="wr-file-sep" />
                <button type="button" className="wr-menu-item" onClick={() => { close(); controller.clearHyperlinks(); sheetFocus(); }}>
                  <Unlink size={15} style={{ color: '#d83b01' }} />
                  <span>{t.cmd.removeHyperlinks}</span>
                </button>
              </div>
            )}
          </Popover>
        </div>

        <Popover
          align="end"
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.sortFilter} onClick={toggle} label={t.cmd.sortFilter} hasDropdown>
              <ArrowDownAZ size={32} style={{ color: '#5c2d91' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="wr-menu calc-editing-menu">
              <button type="button" className="wr-menu-item" onClick={() => { close(); controller.sortSelection(0, true); sheetFocus(); }}>
                <ArrowDownAZ size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.sortAZ}</span>
              </button>
              <button type="button" className="wr-menu-item" onClick={() => { close(); controller.sortSelection(0, false); sheetFocus(); }}>
                <ArrowUpAZ size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.sortZA}</span>
              </button>
              <button type="button" className="wr-menu-item" onClick={() => { close(); setSortOpen(true); }}>
                <Table2 size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.customSort}</span>
              </button>
              <div className="wr-file-sep" />
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  if (!controller.toggleFilter()) onMessage(t.filter.noData);
                  sheetFocus();
                }}
              >
                <Filter size={15} style={{ color: '#5c2d91' }} />
                <span>{t.cmd.filter}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                disabled={!controller.filterActive}
                onClick={() => {
                  close();
                  controller.clearFilterCriteria();
                  sheetFocus();
                }}
              >
                <FilterX size={15} style={{ color: '#d83b01' }} />
                <span>{t.cmd.clearFilter}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                disabled={!controller.filterActive}
                onClick={() => {
                  close();
                  controller.reapplyFilter();
                  sheetFocus();
                }}
              >
                <RotateCw size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.reapplyFilter}</span>
              </button>
            </div>
          )}
        </Popover>

        <Popover
          align="end"
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.findAndSelect} onClick={toggle} label={t.cmd.findAndSelect} hasDropdown>
              <Search size={32} style={{ color: 'var(--fl-accent)' }} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="wr-menu calc-editing-menu">
              <button type="button" className="wr-menu-item" onClick={() => { close(); onFind(); }}>
                <Search size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.find}</span>
              </button>
              <button type="button" className="wr-menu-item" onClick={() => { close(); onFind(); }}>
                <Replace size={15} style={{ color: '#8e44ad' }} />
                <span>{t.cmd.replace}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  const target = window.prompt(t.cmd.goTo);
                  if (target) {
                    const range = parseRange(target.replace(/\$/g, ''));
                    if (range) controller.selectRange(range);
                    else controller.goToName(target.trim());
                  }
                  sheetFocus();
                }}
              >
                <ArrowRight size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.goTo}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectFormulas();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon-spacer" />
                <span>{t.cmd.goToSpecial}</span>
              </button>
              <div className="wr-file-sep" />
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectFormulas();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon-spacer" />
                <span>{t.cmd.formulas}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectNotedCells();
                  sheetFocus();
                }}
              >
                <MessageSquare size={15} style={{ color: 'var(--fl-accent)' }} />
                <span>{t.cmd.comments}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectConditionalCells();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon-spacer" />
                <span>{t.cmd.conditionalFormatting}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectConstants();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon-spacer" />
                <span>{t.cmd.constants}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  controller.selectDataValidationCells();
                  sheetFocus();
                }}
              >
                <span className="calc-menu-icon-spacer" />
                <span>{t.cmd.dataValidation}</span>
              </button>
              <div className="wr-file-sep" />
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  sheetFocus();
                }}
              >
                <MousePointer size={15} />
                <span>{t.cmd.selectObjects}</span>
              </button>
              <button
                type="button"
                className="wr-menu-item"
                onClick={() => {
                  close();
                  sheetFocus();
                }}
              >
                <Layers size={15} style={{ color: '#d83b01' }} />
                <span>{t.cmd.selectionPane}</span>
              </button>
            </div>
          )}
        </Popover>
      </Group>
    </div>
  );
};
