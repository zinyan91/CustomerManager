import React from 'react';
import {
  ChevronDown,
  Filter,
  PieChart,
  Table,
  Trash2,
} from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import { columnName, parseRange } from '../../engine/cellRef';
import { Btn, ButtonCol, Group, LargeBtn, Popover } from '../../../shared/ribbon/controls';
import type { RibbonTabCommonProps } from './types';

export interface TableDesignTabProps extends RibbonTabCommonProps {
  setSummaryOpen?: (open: boolean) => void;
}

const TABLE_PRESETS = [
  { id: 'green', name: 'Table Style Light 1', header: '#107c41', band: '#e2f0d9' },
  { id: 'dark', name: 'Table Style Dark 1', header: '#242424', band: '#f2f2f2' },
  { id: 'blue', name: 'Table Style Medium 2', header: '#0078d4', band: '#deecf9' },
  { id: 'orange', name: 'Table Style Medium 3', header: '#d83b01', band: '#fcebe6' },
  { id: 'gray', name: 'Table Style Light 8', header: '#5c5c5c', band: '#ededed' },
  { id: 'amber', name: 'Table Style Medium 5', header: '#b57c00', band: '#fff4ce' },
  { id: 'cyan', name: 'Table Style Light 10', header: '#008272', band: '#e1f5f2' },
];

export const TableDesignTab: React.FC<TableDesignTabProps> = ({
  controller,
  sheetFocus,
  act,
  onMessage,
  setSummaryOpen,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const activeTable = controller.activeTable();

  const tableName = activeTable?.name ?? 'Table1';
  const headerRow = activeTable?.headerRow ?? true;
  const totalRow = activeTable?.totalRow ?? false;
  const bandedRows = activeTable?.bandedRows ?? true;
  const firstCol = activeTable?.firstCol ?? false;
  const lastCol = activeTable?.lastCol ?? false;
  const bandedCols = activeTable?.bandedCols ?? false;
  const filterBtn = !!controller.filter;

  const handleResize = () => {
    if (!activeTable) return;
    const cur = `${columnName(activeTable.range.c1)}${activeTable.range.r1 + 1}:${columnName(activeTable.range.c2)}${activeTable.range.r2 + 1}`;
    const res = window.prompt(t.tableDesignMessages.resizeMsg, cur);
    if (!res) return;
    const parsed = parseRange(res);
    if (parsed) {
      controller.resizeTable(parsed);
    }
    sheetFocus();
  };

  const handleConvertToRange = () => {
    controller.convertToRange();
    sheetFocus();
  };

  const applyTableStyle = (preset: typeof TABLE_PRESETS[0]) => {
    const range = activeTable ? activeTable.range : controller.selection;
    controller.restyle((style, row, col) => {
      const isHeader = headerRow && row === range.r1;
      const isTotal = totalRow && row === range.r2;
      const isBandedRow = bandedRows && !isHeader && !isTotal && (row - range.r1) % 2 === (headerRow ? 1 : 0);
      const isFirst = firstCol && col === range.c1;
      const isLast = lastCol && col === range.c2;
      const fill = isHeader || isTotal ? preset.header : isBandedRow ? preset.band : undefined;
      return {
        ...style,
        bold: isHeader || isTotal || isFirst || isLast ? true : style.bold,
        color: isHeader || isTotal ? '#ffffff' : style.color,
        fill,
        borders: { top: true, right: true, bottom: true, left: true },
      };
    });
    sheetFocus();
  };

  return (
    <div className="wr-tab-body">
      <Group label={t.groups.tableProperties}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: '#605e5c', fontWeight: 600 }}>{t.tableDesignMessages.tableNameLabel}</span>
            <input
              type="text"
              value={tableName}
              onChange={(e) => controller.updateActiveTable({ name: e.target.value })}
              className="calc-table-name-input"
              style={{
                width: '80px',
                height: '20px',
                fontSize: '0.75rem',
                border: '1px solid #c8c6c4',
                borderRadius: '2px',
                padding: '0 4px',
              }}
            />
          </div>
          <Btn
            title={t.cmd.resizeTable}
            onClick={handleResize}
          >
            <Table size={13} />
            <span className="calc-btn-text">{t.cmd.resizeTableShort}</span>
          </Btn>
        </div>
      </Group>

      <Group label={t.groups.tableTools}>
        <ButtonCol>
          <Btn
            title={t.summary.open}
            onClick={() => {
              if (setSummaryOpen) {
                setSummaryOpen(true);
              }
              sheetFocus();
            }}
          >
            <PieChart size={13} />
            <span className="calc-btn-text">{t.cmd.pivotTableShort}</span>
          </Btn>
          <Btn
            title={t.cmd.removeDuplicates}
            onClick={act(() => {
              const removed = controller.removeDuplicates(window.confirm(t.cmd.hasHeader));
              onMessage(t.cmd.duplicatesRemoved(removed));
            })}
          >
            <Trash2 size={13} />
            <span className="calc-btn-text">{t.cmd.removeDuplicatesShort}</span>
          </Btn>
          <Btn
            title={t.cmd.convertToRange}
            onClick={handleConvertToRange}
          >
            <span className="calc-btn-text">{t.cmd.convertToRangeShort}</span>
          </Btn>
        </ButtonCol>

        <LargeBtn
          title={t.cmd.filterButton}
          active={filterBtn}
          onClick={() => {
            controller.toggleFilter();
            sheetFocus();
          }}
          label={t.cmd.filterButtonShort}
        >
          <Filter size={20} />
        </LargeBtn>
      </Group>

      <Group label={t.groups.tableStyleOptions}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={headerRow} onChange={(e) => controller.updateActiveTable({ headerRow: e.target.checked })} />
              <span>{t.cmd.headerRow}</span>
            </label>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={totalRow} onChange={(e) => controller.updateActiveTable({ totalRow: e.target.checked })} />
              <span>{t.cmd.totalRow}</span>
            </label>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={bandedRows} onChange={(e) => controller.updateActiveTable({ bandedRows: e.target.checked })} />
              <span>{t.cmd.bandedRows}</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={firstCol} onChange={(e) => controller.updateActiveTable({ firstCol: e.target.checked })} />
              <span>{t.cmd.firstColShort}</span>
            </label>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={lastCol} onChange={(e) => controller.updateActiveTable({ lastCol: e.target.checked })} />
              <span>{t.cmd.lastColShort}</span>
            </label>
            <label className="wr-check" style={{ fontSize: '0.72rem' }}>
              <input type="checkbox" checked={bandedCols} onChange={(e) => controller.updateActiveTable({ bandedCols: e.target.checked })} />
              <span>{t.cmd.bandedCols}</span>
            </label>
          </div>
        </div>
      </Group>

      <Group label={t.groups.tableStyles}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '100%' }}>
          {TABLE_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              onClick={() => applyTableStyle(preset)}
              style={{
                width: '42px',
                height: '42px',
                border: '1px solid #d2d0ce',
                borderRadius: '3px',
                padding: '2px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '10px', background: preset.header, borderRadius: '1px' }} />
              <div style={{ height: '7px', background: preset.band, borderRadius: '1px' }} />
              <div style={{ height: '7px', background: '#fff', borderRadius: '1px' }} />
              <div style={{ height: '7px', background: preset.band, borderRadius: '1px' }} />
            </button>
          ))}
          <Popover
            button={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                style={{
                  height: '42px',
                  width: '18px',
                  border: '1px solid #d2d0ce',
                  background: '#f3f2f1',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title={t.groups.tableStyles}
              >
                <ChevronDown size={12} />
              </button>
            )}
          >
            {(close) => (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 44px)', gap: '6px', padding: '8px' }}>
                {TABLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.name}
                    onClick={() => {
                      close();
                      applyTableStyle(preset);
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      border: '1px solid #d2d0ce',
                      borderRadius: '3px',
                      padding: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ height: '10px', background: preset.header, borderRadius: '1px' }} />
                    <div style={{ height: '7px', background: preset.band, borderRadius: '1px' }} />
                    <div style={{ height: '7px', background: '#fff', borderRadius: '1px' }} />
                    <div style={{ height: '7px', background: preset.band, borderRadius: '1px' }} />
                  </button>
                ))}
              </div>
            )}
          </Popover>
        </div>
      </Group>
    </div>
  );
};
