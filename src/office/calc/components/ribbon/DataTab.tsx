import React, { useRef } from 'react';
import { useOfficeI18n } from '../../../i18n';
import { cellName, parseCell } from '../../engine/cellRef';
import { Group, LargeBtn, Popover, SubBtn } from '../../../shared/ribbon/controls';
import type { RibbonTabCommonProps } from './types';
import {
  AdvancedFilterSmallIcon,
  ClearFilterSmallIcon,
  DataValidationIcon,
  FilterLargeIcon,
  FlashFillIcon,
  FromTextCsvIcon,
  GroupLargeIcon,
  HideDetailSmallIcon,
  ReapplyFilterSmallIcon,
  RemoveDuplicatesIcon,
  ShowDetailSmallIcon,
  SortAscSmallIcon,
  SortCustomLargeIcon,
  SortDescSmallIcon,
  SubtotalLargeIcon,
  TextToColumnsIcon,
  UngroupLargeIcon,
  WhatIfAnalysisIcon,
} from './dataIcons';

export interface DataTabProps extends RibbonTabCommonProps {
  setSortOpen: (open: boolean) => void;
  setValidationOpen: (open: boolean) => void;
}

const askNumber = (message: string): number | null => {
  const ans = window.prompt(message);
  if (ans === null || ans.trim() === '') return null;
  const num = Number(ans);
  return Number.isFinite(num) ? num : null;
};

export const DataTab: React.FC<DataTabProps> = ({
  controller,
  sheetFocus,
  act,
  onMessage,
  setSortOpen,
  setValidationOpen,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      controller.paste(text);
      onMessage(file.name);
    } catch (error) {
      onMessage(t.errors.openFailed(error instanceof Error ? error.message : String(error)));
    }
    e.target.value = '';
    sheetFocus();
  };

  const handleGoalSeek = () => {
    const target = window.prompt(t.goalSeek.target, cellName(controller.activeCell.row, controller.activeCell.col));
    const wanted = target === null ? null : askNumber(t.goalSeek.value);
    const changing = wanted === null ? null : window.prompt(t.goalSeek.changing);
    if (target === null || wanted === null || !changing) return;
    const result = controller.goalSeek(target.trim(), wanted, changing.trim());
    onMessage(result === null ? t.goalSeek.none : t.goalSeek.found(result));
    sheetFocus();
  };

  const handleSubtotal = () => {
    const groupCol = window.prompt(t.subtotal.group, 'A');
    const valCol = window.prompt(t.subtotal.value, 'B');
    const fn = window.prompt(t.subtotal.fn, 'sum');
    if (!groupCol || !valCol || !fn) return;
    const gc = parseCell(`${groupCol}1`)?.col;
    const vc = parseCell(`${valCol}1`)?.col;
    const f = fn.toLowerCase().trim() as 'sum' | 'count' | 'average' | 'max' | 'min';
    if (gc === undefined || vc === undefined || !['sum', 'count', 'average', 'max', 'min'].includes(f)) return;
    const count = controller.addSubtotals(gc, vc, f, { total: t.subtotal.total, grand: t.subtotal.grand });
    onMessage(`+${count}`);
    sheetFocus();
  };

  return (
    <div className="wr-tab-body">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        style={{ display: 'none' }}
        onChange={(e) => void handleCsvImport(e)}
      />

      <Group label={t.groups.getTransformData}>
        <LargeBtn
          title={t.cmd.fromTextCsv}
          onClick={() => csvInputRef.current?.click()}
          label={t.cmd.fromTextCsv}
        >
          <FromTextCsvIcon size={28} />
        </LargeBtn>
      </Group>


      {/* 3. Nhóm Sort & Filter - Chuẩn Microsoft Excel */}
      <Group label={t.groups.sortFilter} onDialog={() => setSortOpen(true)} dialogTitle={t.sort.open}>
        <div className="calc-ribbon-col-2">
          <SubBtn
            title={t.cmd.sortAsc}
            icon={<SortAscSmallIcon size={14} />}
            label="A → Z"
            onClick={act(() => controller.sortSelection(0, true))}
          />
          <SubBtn
            title={t.cmd.sortDesc}
            icon={<SortDescSmallIcon size={14} />}
            label="Z → A"
            onClick={act(() => controller.sortSelection(0, false))}
          />
        </div>

        <LargeBtn title={t.sort.open} onClick={() => setSortOpen(true)} label={t.cmd.sort}>
          <SortCustomLargeIcon size={28} />
        </LargeBtn>

        <LargeBtn
          title={t.filter.toggle}
          active={!!controller.filter}
          onClick={() => {
            if (!controller.toggleFilter()) onMessage(t.filter.noData);
            sheetFocus();
          }}
          label={t.cmd.filter}
        >
          <FilterLargeIcon size={28} />
        </LargeBtn>

        <div className="calc-ribbon-col-3">
          <SubBtn
            title={t.cmd.clearFilter}
            icon={<ClearFilterSmallIcon size={14} />}
            label={t.cmd.clearFilter}
            disabled={!controller.filter}
            onClick={act(() => {
              controller.toggleFilter();
              controller.toggleFilter();
            })}
          />
          <SubBtn
            title={t.cmd.reapplyFilter}
            icon={<ReapplyFilterSmallIcon size={14} />}
            label={t.cmd.reapplyFilter}
            disabled={!controller.filter}
            onClick={act(() => controller.recalculate())}
          />
          <SubBtn
            title={t.cmd.advancedFilter}
            icon={<AdvancedFilterSmallIcon size={14} />}
            label={t.cmd.advancedFilter}
            onClick={() => setSortOpen(true)}
          />
        </div>
      </Group>

      {/* 4. Nhóm Data Tools - Chuẩn Microsoft Excel */}
      <Group label={t.groups.dataTools}>
        <LargeBtn
          title={t.cmd.textToColumns}
          onClick={() => {
            const answer = window.prompt(t.cmd.delimiterPrompt, ',');
            if (answer !== null) controller.textToColumns(answer === '\t' ? '\t' : answer);
            sheetFocus();
          }}
          label={t.cmd.textToColumns}
        >
          <TextToColumnsIcon size={28} />
        </LargeBtn>

        <LargeBtn
          title={t.cmd.flashFill}
          onClick={act(() => {
            controller.flashFill?.();
          })}
          label={t.cmd.flashFill}
        >
          <FlashFillIcon size={28} />
        </LargeBtn>

        <LargeBtn
          title={t.cmd.removeDuplicates}
          onClick={act(() => {
            const removed = controller.removeDuplicates(window.confirm(t.cmd.hasHeader));
            onMessage(t.cmd.duplicatesRemoved(removed));
          })}
          label={t.cmd.removeDuplicates}
        >
          <RemoveDuplicatesIcon size={28} />
        </LargeBtn>

        <Popover
          button={({ toggle }) => (
            <LargeBtn
              title={t.validation.open}
              onClick={toggle}
              label={t.cmd.dataValidation}
              hasDropdown
            >
              <DataValidationIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-function-menu" style={{ minWidth: 170 }}>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  setValidationOpen(true);
                }}
              >
                {t.cmd.dataValidation}
              </button>
            </div>
          )}
        </Popover>

      </Group>

      {/* 5. Nhóm Forecast - Chuẩn Microsoft Excel */}
      <Group label={t.groups.forecast}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn
              title={t.cmd.whatIfAnalysis}
              onClick={toggle}
              label={t.cmd.whatIfAnalysis}
              hasDropdown
            >
              <WhatIfAnalysisIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-function-menu" style={{ minWidth: 185 }}>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  handleGoalSeek();
                }}
              >
                {t.cmd.goalSeek}
              </button>
            </div>
          )}
        </Popover>

      </Group>

      {/* 6. Nhóm Outline - Chuẩn Microsoft Excel */}
      <Group label={t.groups.outline} onDialog={() => controller.showLevel(1)} dialogTitle={t.cmd.hideDetail}>
        <Popover
          button={({ toggle }) => (
            <LargeBtn
              title={t.cmd.group}
              onClick={toggle}
              label={t.cmd.group}
              hasDropdown
            >
              <GroupLargeIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-function-menu" style={{ minWidth: 160 }}>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.groupLines('row', 1);
                  sheetFocus();
                }}
              >
                {t.cmd.groupRowShort}
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.groupLines('col', 1);
                  sheetFocus();
                }}
              >
                {t.cmd.groupColShort}
              </button>
            </div>
          )}
        </Popover>

        <Popover
          button={({ toggle }) => (
            <LargeBtn
              title={t.cmd.ungroup}
              onClick={toggle}
              label={t.cmd.ungroup}
              hasDropdown
            >
              <UngroupLargeIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => (
            <div className="calc-function-menu" style={{ minWidth: 160 }}>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.groupLines('row', -1);
                  sheetFocus();
                }}
              >
                {t.cmd.ungroupRowShort}
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.groupLines('col', -1);
                  sheetFocus();
                }}
              >
                {t.cmd.ungroupColShort}
              </button>
            </div>
          )}
        </Popover>

        <LargeBtn title={t.subtotal.open} onClick={handleSubtotal} label={t.cmd.subtotal}>
          <SubtotalLargeIcon size={28} />
        </LargeBtn>

        <div className="calc-ribbon-col-2">
          <SubBtn
            title={t.cmd.showDetail}
            icon={<ShowDetailSmallIcon size={14} />}
            label={t.cmd.showDetail}
            onClick={act(() => controller.showLevel(8))}
          />
          <SubBtn
            title={t.cmd.hideDetail}
            icon={<HideDetailSmallIcon size={14} />}
            label={t.cmd.hideDetail}
            onClick={act(() => controller.showLevel(1))}
          />
        </div>
      </Group>
    </div>
  );
};
