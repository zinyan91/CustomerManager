import React, { useState } from 'react';
import { useOfficeI18n } from '../../../i18n';
import { Group, LargeBtn, LargeSplitBtn, Popover, SubBtn } from '../../../shared/ribbon/controls';
import type { RibbonTabCommonProps } from './types';
import type { ViewOptions } from '../viewOptions';
import { InsertFunctionDialog } from '../InsertFunctionDialog';
import {
  AutoSumSigmaIcon,
  CalculateSheetSmallIcon,
  CalculateSmallIcon,
  CreateFromSelectionSmallIcon,
  DateTimeFunctionIcon,
  DefineNameSmallIcon,
  FinancialIcon,
  InsertFunctionFxIcon,
  LogicalIcon,
  LookupRefIcon,
  MathTrigIcon,
  MoreFunctionsIcon,
  NameManagerIcon,
  RecentlyUsedIcon,
  ShowFormulasIcon,
  TextFunctionIcon,
  TraceDependentsIcon,
  TracePrecedentsIcon,
  UseInFormulaSmallIcon,
} from './formulaIcons';
import {
  DATE_TIME_FUNCTIONS,
  FINANCIAL_FUNCTIONS,
  LOGICAL_FUNCTIONS,
  LOOKUP_REF_FUNCTIONS,
  MATH_TRIG_FUNCTIONS,
  MORE_FUNCTIONS,
  RECENTLY_USED_FUNCTIONS,
  TEXT_FUNCTIONS,
} from './formulaCatalog';

export interface FormulasTabProps extends RibbonTabCommonProps {
  setNamesOpen: (open: boolean) => void;
  view: ViewOptions;
  onView: (view: ViewOptions) => void;
}

export const FormulasTab: React.FC<FormulasTabProps> = ({
  controller,
  sheetFocus,
  act,
  onMessage,
  setNamesOpen,
  view,
  onView,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const [insertOpen, setInsertOpen] = useState(false);

  const insertFormula = (fnName: string) => {
    controller.insertFunction(fnName);
    sheetFocus();
  };

  const focusFormulaBar = () => setInsertOpen(true);

  const renderFunctionMenu = (functions: string[], close: () => void) => (
    <div className="calc-function-menu">
      {functions.map((fn) => (
        <button
          key={fn}
          type="button"
          className="calc-function-menu-item"
          onClick={() => {
            close();
            insertFormula(fn);
          }}
        >
          {fn}
        </button>
      ))}
      <div className="calc-function-menu-divider" />
      <button
        type="button"
        className="calc-function-menu-footer"
        onClick={() => {
          close();
          focusFormulaBar();
        }}
      >
        <span className="calc-function-menu-fx">fx</span>
        <span>{t.cmd.insertFunctionEllipsis}</span>
      </button>
    </div>
  );

  return (
    <div className="wr-tab-body">
      {insertOpen && (
        <InsertFunctionDialog
          onInsert={(name) => {
            setInsertOpen(false);
            insertFormula(name);
          }}
          onClose={() => setInsertOpen(false)}
        />
      )}
      {/* 1. Nhóm Function Library - Chuẩn Microsoft Excel */}
      <Group label={t.groups.functionLibrary}>
        {/* Nút 1: Insert Function (fx) */}
        <LargeBtn
          title={t.cmd.insertFunction}
          onClick={focusFormulaBar}
          label={t.cmd.insertFunction}
        >
          <InsertFunctionFxIcon size={28} />
        </LargeBtn>

        {/* Nút 2: AutoSum (Split Button chuẩn Excel) */}
        <Popover
          button={({ toggle }) => (
            <LargeSplitBtn
              title={t.cmd.autoSum}
              onAction={() => {
                controller.autoSum('SUM');
                sheetFocus();
              }}
              onToggle={toggle}
              label={t.cmd.autoSumShort}
            >
              <AutoSumSigmaIcon size={26} />
            </LargeSplitBtn>
          )}
        >
          {(close) => (
            <div className="calc-function-menu" style={{ minWidth: 185 }}>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.autoSum('SUM');
                  sheetFocus();
                }}
              >
                <span style={{ fontWeight: 'bold', marginRight: 4 }}>∑</span>
                <span>{t.cmd.sum}</span>
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.autoSum('AVERAGE');
                  sheetFocus();
                }}
              >
                <span style={{ display: 'inline-block', width: 14 }} />
                <span>{t.cmd.average}</span>
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.autoSum('COUNT');
                  sheetFocus();
                }}
              >
                <span style={{ display: 'inline-block', width: 14 }} />
                <span>{t.cmd.countNumbersShort}</span>
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.autoSum('MAX');
                  sheetFocus();
                }}
              >
                <span style={{ display: 'inline-block', width: 14 }} />
                <span>{t.cmd.max}</span>
              </button>
              <button
                type="button"
                className="calc-function-menu-item"
                onClick={() => {
                  close();
                  controller.autoSum('MIN');
                  sheetFocus();
                }}
              >
                <span style={{ display: 'inline-block', width: 14 }} />
                <span>{t.cmd.min}</span>
              </button>
              <div className="calc-function-menu-divider" />
              <button
                type="button"
                className="calc-function-menu-footer"
                onClick={() => {
                  close();
                  focusFormulaBar();
                }}
              >
                <span className="calc-function-menu-fx">fx</span>
                <span>{t.cmd.moreFunctionsEllipsis}</span>
              </button>
            </div>
          )}
        </Popover>

        {/* Nút 3: Recently Used */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.recentlyUsed} onClick={toggle} label={t.cmd.recentlyUsed} hasDropdown>
              <RecentlyUsedIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(RECENTLY_USED_FUNCTIONS, close)}
        </Popover>

        {/* Nút 4: Financial */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.financial} onClick={toggle} label={t.cmd.financial} hasDropdown>
              <FinancialIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(FINANCIAL_FUNCTIONS, close)}
        </Popover>

        {/* Nút 5: Logical */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.logical} onClick={toggle} label={t.cmd.logical} hasDropdown>
              <LogicalIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(LOGICAL_FUNCTIONS, close)}
        </Popover>

        {/* Nút 6: Text */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.textFn} onClick={toggle} label={t.cmd.textFn} hasDropdown>
              <TextFunctionIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(TEXT_FUNCTIONS, close)}
        </Popover>

        {/* Nút 7: Date & Time */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.dateTime} onClick={toggle} label={t.cmd.dateTime} hasDropdown>
              <DateTimeFunctionIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(DATE_TIME_FUNCTIONS, close)}
        </Popover>

        {/* Nút 8: Lookup & Reference */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.lookupRef} onClick={toggle} label={t.cmd.lookupRef} hasDropdown>
              <LookupRefIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(LOOKUP_REF_FUNCTIONS, close)}
        </Popover>

        {/* Nút 9: Math & Trig */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.mathTrig} onClick={toggle} label={t.cmd.mathTrig} hasDropdown>
              <MathTrigIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(MATH_TRIG_FUNCTIONS, close)}
        </Popover>

        {/* Nút 10: More Functions */}
        <Popover
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.moreFunctions} onClick={toggle} label={t.cmd.moreFunctionsShort} hasDropdown>
              <MoreFunctionsIcon size={28} />
            </LargeBtn>
          )}
        >
          {(close) => renderFunctionMenu(MORE_FUNCTIONS, close)}
        </Popover>
      </Group>

      {/* 2. Nhóm Defined Names - Chuẩn Microsoft Excel */}
      <Group label={t.groups.definedNames} onDialog={() => setNamesOpen(true)} dialogTitle={t.names.open}>
        <LargeBtn title={t.names.open} onClick={() => setNamesOpen(true)} label={t.cmd.nameManager}>
          <NameManagerIcon size={28} />
        </LargeBtn>
        <div className="calc-ribbon-col-3">
          <SubBtn
            title={t.cmd.defineName}
            icon={<DefineNameSmallIcon size={14} />}
            label={t.cmd.defineName}
            hasDropdown
            onClick={() => setNamesOpen(true)}
          />
          <SubBtn
            title={t.cmd.useInFormula}
            icon={<UseInFormulaSmallIcon size={14} />}
            label={t.cmd.useInFormula}
            hasDropdown
            onClick={() => setNamesOpen(true)}
          />
          <SubBtn
            title={t.cmd.createFromSelection}
            icon={<CreateFromSelectionSmallIcon size={14} />}
            label={t.cmd.createFromSelection}
            onClick={act(() => {
              if (controller.namesFromSelection() === 0) onMessage(t.names.invalidName);
            })}
          />
        </div>
      </Group>

      <Group label={t.groups.formulaAuditing}>
        <div className="calc-ribbon-col-3">
          <SubBtn
            title={t.cmd.tracePrecedents}
            icon={<TracePrecedentsIcon size={14} />}
            label={t.cmd.tracePrecedents}
            onClick={act(() => controller.selectPrecedents())}
          />
          <SubBtn
            title={t.cmd.traceDependents}
            icon={<TraceDependentsIcon size={14} />}
            label={t.cmd.traceDependents}
            onClick={act(() => controller.selectDependents())}
          />
          <SubBtn
            title={t.cmd.showFormulas}
            icon={<ShowFormulasIcon size={14} />}
            label={t.cmd.showFormulas}
            onClick={act(() => onView({ ...view, showFormulas: !view.showFormulas }))}
          />
        </div>
      </Group>

      {/* 4. Nhóm Calculation - Chuẩn Microsoft Excel */}
      <Group label={t.groups.calculation}>
        <div className="calc-ribbon-col-2">
          <SubBtn
            title={t.cmd.calculateNow}
            icon={<CalculateSmallIcon size={14} />}
            label={t.cmd.calculateNow}
            onClick={act(() => controller.recalculate())}
          />
          <SubBtn
            title={t.cmd.calculateSheet}
            icon={<CalculateSheetSmallIcon size={14} />}
            label={t.cmd.calculateSheet}
            onClick={act(() => controller.recalculate())}
          />
        </div>
      </Group>
    </div>
  );
};
