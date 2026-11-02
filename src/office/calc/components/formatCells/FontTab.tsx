import React from 'react';
import { useOfficeI18n } from '../../../i18n';
import { FONT_CHOICES, FONT_SIZES_PT } from '../../../shared/formatOptions';
import type { FormatCellsDraft } from './types';

export interface FontTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
}

export const FontTab: React.FC<FontTabProps> = ({ draft, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.font;

  const currentFont = draft.fontFamily ?? FONT_CHOICES[0].label;
  const currentSize = draft.fontSize ?? 11;
  const isBold = !!draft.bold;
  const isItalic = !!draft.italic;
  const currentColor = draft.color ?? '#000000';

  const styleMode = isBold && isItalic ? 'boldItalic' : isBold ? 'bold' : isItalic ? 'italic' : 'regular';

  const handleStyleChange = (mode: 'regular' | 'italic' | 'bold' | 'boldItalic') => {
    switch (mode) {
      case 'regular':
        onChange({ bold: undefined, italic: undefined });
        break;
      case 'italic':
        onChange({ bold: undefined, italic: true });
        break;
      case 'bold':
        onChange({ bold: true, italic: undefined });
        break;
      case 'boldItalic':
        onChange({ bold: true, italic: true });
        break;
    }
  };

  return (
    <div className="fc-tab-pane fc-font-pane">
      <div className="fc-font-grid">
        <div className="fc-font-col">
          <div className="fc-label">{t.font}</div>
          <div className="fc-list-box" role="listbox" aria-label={t.font}>
            {FONT_CHOICES.map((f) => (
              <button
                key={f.label}
                type="button"
                role="option"
                aria-selected={currentFont === f.label}
                className={`fc-list-item${currentFont === f.label ? ' is-selected' : ''}`}
                style={{ fontFamily: f.value }}
                onClick={() => onChange({ fontFamily: f.label })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fc-font-col">
          <div className="fc-label">{t.fontStyle}</div>
          <div className="fc-list-box" role="listbox" aria-label={t.fontStyle}>
            {(['regular', 'italic', 'bold', 'boldItalic'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="option"
                aria-selected={styleMode === mode}
                className={`fc-list-item${styleMode === mode ? ' is-selected' : ''}`}
                onClick={() => handleStyleChange(mode)}
              >
                {t.styles[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="fc-font-col fc-size-col">
          <div className="fc-label">{t.size}</div>
          <div className="fc-list-box" role="listbox" aria-label={t.size}>
            {FONT_SIZES_PT.map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={currentSize === s}
                className={`fc-list-item${currentSize === s ? ' is-selected' : ''}`}
                onClick={() => onChange({ fontSize: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fc-font-lower">
        <div className="fc-effects-box">
          <div className="fc-label">{t.effects}</div>
          <div className="fc-effects-controls">
            <label className="fc-check-row">
              <input
                type="checkbox"
                checked={!!draft.strike}
                onChange={(e) => onChange({ strike: e.target.checked ? true : undefined })}
              />
              <span>{t.strikethrough}</span>
            </label>

            <label className="fc-field-row">
              <span>{t.underline}</span>
              <select
                value={draft.underline ? 'single' : 'none'}
                onChange={(e) => onChange({ underline: e.target.value === 'single' ? true : undefined })}
              >
                <option value="none">{t.underlines.none}</option>
                <option value="single">{t.underlines.single}</option>
              </select>
            </label>

            <label className="fc-field-row">
              <span>{t.color}</span>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onChange({ color: e.target.value })}
                className="fc-color-input"
              />
            </label>
          </div>
        </div>

        <div className="fc-font-preview-box">
          <div className="fc-label">{t.preview}</div>
          <div
            className="fc-font-sample-display"
            style={{
              fontFamily: currentFont,
              fontSize: `${Math.min(24, Math.max(10, currentSize))}px`,
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: `${draft.underline ? 'underline ' : ''}${draft.strike ? 'line-through' : ''}`.trim() || undefined,
              color: currentColor,
            }}
          >
            {t.previewText}
          </div>
        </div>
      </div>
    </div>
  );
};
