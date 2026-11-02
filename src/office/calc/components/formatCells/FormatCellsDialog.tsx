import React, { useRef, useState } from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import type { Scalar } from '../../engine/values';
import { AlignmentTab } from './AlignmentTab';
import { BorderTab } from './BorderTab';
import { FillTab } from './FillTab';
import { FontTab } from './FontTab';
import { NumberTab } from './NumberTab';
import { ProtectionTab } from './ProtectionTab';
import type { FormatCellsDraft, FormatCellsTabId } from './types';

export interface FormatCellsDialogProps {
  controller: CalcController;
  initialTab?: FormatCellsTabId;
  onClose: () => void;
}

export const FormatCellsDialog: React.FC<FormatCellsDialogProps> = ({
  controller,
  initialTab = 'number',
  onClose,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells;
  const root = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<FormatCellsTabId>(initialTab);

  const style = controller.activeStyle();
  const [draft, setDraft] = useState<FormatCellsDraft>(() => ({
    numFmt: style.numFmt ?? 'General',
    hAlign: style.hAlign,
    vAlign: style.vAlign,
    wrap: style.wrap,
    shrink: style.shrink,
    indent: style.indent,
    rotation: style.rotation,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    bold: style.bold,
    italic: style.italic,
    underline: style.underline,
    strike: style.strike,
    color: style.color,
    fill: style.fill,
    borders: style.borders ? { ...style.borders } : undefined,
    unlocked: style.unlocked,
  }));

  const { row, col } = controller.activeCell;
  const ownValue = controller.wb.valueAt(controller.active, row, col);
  const sampleValue: Scalar = typeof ownValue === 'number' ? ownValue : 1234.5678;

  const handleDraftChange = (patch: Partial<FormatCellsDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const apply = () => {
    // Apply number format code if changed
    if (draft.numFmt !== undefined) {
      const code = draft.numFmt.trim() === '' ? 'General' : draft.numFmt.trim();
      controller.setNumFmt(code);
    }

    // Apply all style attributes directly to selection
    controller.applyStyle({
      hAlign: draft.hAlign,
      vAlign: draft.vAlign,
      wrap: draft.wrap,
      shrink: draft.shrink,
      indent: draft.indent,
      rotation: draft.rotation,
      fontFamily: draft.fontFamily,
      fontSize: draft.fontSize,
      bold: draft.bold,
      italic: draft.italic,
      underline: draft.underline,
      strike: draft.strike,
      color: draft.color,
      fill: draft.fill,
      borders: draft.borders,
      unlocked: draft.unlocked,
    });

    onClose();
  };

  const tabs: Array<{ id: FormatCellsTabId; label: string }> = [
    { id: 'number', label: t.tabs.number },
    { id: 'alignment', label: t.tabs.alignment },
    { id: 'font', label: t.tabs.font },
    { id: 'border', label: t.tabs.border },
    { id: 'fill', label: t.tabs.fill },
    { id: 'protection', label: t.tabs.protection },
  ];

  return (
    <div
      className="calc-dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={root}
        className="calc-dialog calc-format-cells-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
          else if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') apply();
        }}
      >
        <div className="fc-dialog-header">
          <h2 className="calc-dialog-title">{t.title}</h2>
          <div className="fc-tabs-bar" role="tablist">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={`fc-tab-btn${activeTab === id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="calc-dialog-body fc-dialog-body" role="tabpanel">
          {activeTab === 'number' && (
            <NumberTab draft={draft} onChange={handleDraftChange} sampleValue={sampleValue} />
          )}
          {activeTab === 'alignment' && (
            <AlignmentTab draft={draft} onChange={handleDraftChange} />
          )}
          {activeTab === 'font' && (
            <FontTab draft={draft} onChange={handleDraftChange} />
          )}
          {activeTab === 'border' && (
            <BorderTab draft={draft} onChange={handleDraftChange} />
          )}
          {activeTab === 'fill' && (
            <FillTab draft={draft} onChange={handleDraftChange} />
          )}
          {activeTab === 'protection' && (
            <ProtectionTab draft={draft} onChange={handleDraftChange} />
          )}
        </div>

        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="wr-text-btn is-primary" onClick={apply}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
};
